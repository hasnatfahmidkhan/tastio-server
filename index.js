const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();
const port = 3000;

const serviceAccount = require("./tastio-web-fb-service-key.json");

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

    //? Reviews POST Api
    app.post("/reviews", verifyFBToken, async (req, res) => {
      const newReview = req.body;
      const tokenEmail = req.token_email;

      if (tokenEmail === newReview.email) {
        const result = await reviewsCollection.insertOne({
          ...newReview,
        });
        res.status(200).send(result);
      }
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
