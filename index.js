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
    // await client.connect();
    const tastioDB = client.db("tastioDB");
    const usersCollection = tastioDB.collection("users");
    const reviewsCollection = tastioDB.collection("reviews");
    const favouriteCollection = tastioDB.collection("favourite");
    const restaurantsCollection = tastioDB.collection("restaurants");
    const menuCollection = tastioDB.collection("menu");

    //? User related apis
    // get user role
    app.get("/users/:email/role", async (req, res) => {
      const { email } = req.params;
      const result = await usersCollection.findOne(
        { email: email },
        { projection: { role: 1, status: 1, _id: 0 } }
      );

      res.status(200).json(result);
    });

    // user insert into db api
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      newUser.role = "user";
      newUser.status = "active";
      const filter = { email: newUser.email };
      const isExits = await usersCollection.findOne(filter);
      if (isExits) {
        console.log("user already exits");
        return res.send({ message: "user already exits" });
      } else {
        const result = await usersCollection.insertOne({ ...newUser });
        res.status(200).send(result);
      }
    });

    // restaurants apis
    app.get("/restaurants/seller/:email", verifyFBToken, async (req, res) => {
      const email = req.params.email;
      const query = { ownerEmail: email };
      const result = await restaurantsCollection.findOne(query);
      res.send(result);
    });

    app.get("/restaurants", async (req, res) => {
      const { status } = req.query;
      const query = { status: status };
      const result = await restaurantsCollection.find(query).toArray();
      res.status(200).json(result);
    });

    app.post("/restaurants", async (req, res) => {
      const sellerRequest = req.body;
      sellerRequest.averageRating = 0;
      sellerRequest.totalReviews = 0;
      const query = { ownerEmail: sellerRequest.ownerEmail };
      const isExitsOwner = await restaurantsCollection.findOne(query);
      if (isExitsOwner) {
        return res
          .status(200)
          .json({ isExits: true, message: "Seler already exits" });
      }
      const result = await restaurantsCollection.insertOne(sellerRequest);
      res.status(201).json(result);
    });

    app.patch("/restaurants/verify/:id", verifyFBToken, async (req, res) => {
      const id = req.params.id;
      const { email } = req.body;

      const filterRestaurant = { _id: new ObjectId(id) };
      const updateRestaurant = {
        $set: { status: "verified" },
      };
      const restaurantResult = await restaurantsCollection.updateOne(
        filterRestaurant,
        updateRestaurant
      );

      const filterUser = { email: email };
      const updateUser = {
        $set: { role: "seller" },
      };
      const userResult = await usersCollection.updateOne(
        filterUser,
        updateUser
      );

      res.send({ restaurantResult, userResult });
    });

    app.post("/menu", async (req, res) => {
      const foodItem = req.body;

      foodItem.totalReviews = 0;
      foodItem.averageRating = 0;
      const result = await menuCollection.insertOne(foodItem);
      res.status(201).json(result);
    });

    //? Reviews Get Api
    // top reviews api
    app.get("/latest-reviews", async (req, res) => {
      const result = await reviewsCollection
        .find()
        .sort({ postedAt: -1 })
        .limit(8)
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

    // search review
    app.get("/search", async (req, res) => {
      const searchText = req.query.search;
      const filter = { foodName: { $regex: searchText, $options: "i" } };
      const result = await reviewsCollection.find(filter).toArray();
      res.send(result);
    });

    // my reviews api
    app.get("/my-reviews", verifyFBToken, async (req, res) => {
      const email = req.query.email;
      const tokenEmail = req.token_email;
      const filter = {};
      if (email === tokenEmail) {
        if (email !== tokenEmail) {
          return res.status(403).send({ message: "forbidden access" });
        } else {
          filter.reviewerEmail = email;
        }
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
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const { _id, ...update } = req.body;
      const options = {};
      const result = await reviewsCollection.updateOne(
        filter,
        { $set: update },
        options
      );
      res.status(200).send(result);
    });

    //! delete review
    app.delete("/my-reviews/:id", verifyFBToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await reviewsCollection.deleteOne(filter);
      res.status(200).send(result);
    });

    //? get favourite review
    app.get("/favourites", verifyFBToken, async (req, res) => {
      const email = req.query.email;
      const tokenEmail = req.token_email;

      const filter = {};
      if (email) {
        if (email !== tokenEmail) {
          return res.status(403).send({ message: "forbidden access" });
        }
        filter.email = email;
      }
      const result = await favouriteCollection.find(filter).toArray();
      res.status(200).send(result);
    });

    //? favourite review
    app.post("/favourites", verifyFBToken, async (req, res) => {
      const favourite = req.body;
      const result = await favouriteCollection.insertOne(favourite);
      res.status(200).send(result);
    });

    //! delete favourite review
    app.delete("/favourites/:id", verifyFBToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await favouriteCollection.deleteOne(filter);
      res.send(result);
    });

    // leaderboard for reviewers
    app.get("/leaderboard", async (req, res) => {
      const { limit } = req.query;
      const pipeline = [
        { $group: { _id: "$reviewerEmail", totalReviews: { $sum: 1 } } },
        { $sort: { totalReviews: -1 } },
        // only add $limit if limit exists
        ...(limit ? [{ $limit: Number(limit) }] : []),
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "email",
            as: "userInfo",
          },
        },
        { $unwind: "$userInfo" },
        {
          $project: {
            _id: 0,
            reviewerEmail: "$_id",
            name: "$userInfo.name",
            photo: "$userInfo.photo",
            totalReviews: 1,
          },
        },
      ];

      const result = await reviewsCollection.aggregate(pipeline).toArray();

      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
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
