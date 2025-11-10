const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();
const port = 3000;

const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
  "utf8"
);

const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middle ware
app.use(cors());
app.use(express.json());

// Firebase middle
const verifyFBToken = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({ message: "unauthorized acess" });
  }
  const token = authorization.split(" ")[1];
  const decoded = await admin.auth().verifyIdToken(token);
  req.token_email = decoded.email;
  next();
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qk2ebsj.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const tastioDB = client.db("tastioDB");
    const usersCollection = tastioDB.collection("users");
    const reviewsCollection = tastioDB.collection("reviews");

    // user insert into db api
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const filter = { email: newUser.email };
      const isExits = await usersCollection.findOne({ filter });
      if (isExits) {
        return res.send({ message: "user already exits" });
      } else {
        const result = await usersCollection.insertOne({ ...newUser });
        res.status(200).send(result);
      }
    });

    //? Reviews Get Api
    // top reviews api
    app.get("/latest-reviews", async (req, res) => {
      const result = await reviewsCollection
        .find()
        .sort({ postedAt: -1 })
        .limit(6)
        .toArray();
      res.status(200).send(result);
    });

    // all reviews api
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection
        .find()
        .sort({ postedAt: -1 })
        .toArray();
      res.status(200).send(result);
    });

    // reviews details api
    app.get("/reviews/:id", verifyFBToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const result = await reviewsCollection.findOne(filter);

      res.status(200).send(result);
    });

    // my reviews api
    app.get("/my-reviews", verifyFBToken, async (req, res) => {
      const email = req.query.email;
      const tokenEmail = req.token_email;
      const filter = {};
      if (email === tokenEmail) {
        filter.reviewerEmail = email;
      }
      const result = await reviewsCollection
        .find(filter)
        .sort({ postedAt: -1 })
        .toArray();
      res.status(200).send(result);
    });

    //? Reviews POST Api
    app.post("/reviews", verifyFBToken, async (req, res) => {
      const newReview = req.body;
      const tokenEmail = req.token_email;

      if (tokenEmail === newReview.reviewerEmail) {
        const result = await reviewsCollection.insertOne({
          ...newReview,
        });
        res.status(200).send(result);
      }
    });

    //? update review
    app.patch("/reviews/:id", verifyFBToken, async (req, res) => {
      const updateReivew = req.body;
      console.log(updateReivew);
      res.status(200).send({ message: "data updated" });
    });

    //! delete review
    app.delete("/my-reviews/:id", verifyFBToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await reviewsCollection.deleteOne(filter);
      res.status(200).send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Tastio server is running");
});

app.listen(port, () => {
  console.log(`Tatio is running on ${port}`);
});
