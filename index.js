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

  req.token_email = decoded?.email;
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
    const postsCollection = tastioDB.collection("post");
    const categoriesCollection = tastioDB.collection("categories");

    // Middleware for verify user
    const verifyAdmin = async (req, res, next) => {
      try {
        const email = req.token_email;
        const user = await usersCollection.findOne({ email });

        if (!user || user.role !== "admin") {
          return res.status(403).send({ message: "Admin access required" });
        }

        next();
      } catch (error) {
        res.status(500).send({ message: "Admin verification failed" });
      }
    };

    const verifySeller = async (req, res, next) => {
      try {
        const email = req.token_email;

        const user = await usersCollection.findOne({ email: email });

        if (!user || user.role !== "seller") {
          return res.status(403).send({ message: "Seller access required" });
        }

        next();
      } catch (error) {
        res.status(500).send({ message: "Seller verification failed" });
      }
    };

    //? User related apis
    // GET User Profile Stats
    app.get("/users/profile/:email", verifyFBToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.token_email)
        return res.status(403).send({ message: "forbidden" });

      // 1. Basic User Info
      const user = await usersCollection.findOne({ email });

      // 2. Extra Stats based on Role
      let stats = {};

      if (user.role === "user") {
        const reviewCount = await reviewsCollection.countDocuments({
          reviewerEmail: email,
        });
        stats = { reviewCount };
      } else if (user.role === "seller") {
        const restaurant = await restaurantsCollection.findOne({
          ownerEmail: email,
        });
        const foodCount = await menuCollection.countDocuments({
          sellerEmail: email,
        });
        stats = {
          restaurantName: restaurant?.name || "No Shop",
          foodCount,
        };
      }

      res.send({ user, stats });
    });

    // GET All Users (with Search & Role Filter)
    app.get("/users", verifyFBToken, verifyAdmin, async (req, res) => {
      const search = req.query.search || "";
      const role = req.query.role || ""; // "admin", "seller", "user"

      let query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      };

      if (role && role !== "All") {
        query.role = role;
      }

      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // PATCH Update User Role
    app.patch(
      "/users/role/:id",
      verifyFBToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const { role } = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: { role: role },
        };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    // DELETE User
    app.delete("/users/:id", verifyFBToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

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

    // GET Restaurants (Support Status Filter & Search)
    app.get("/restaurants", async (req, res) => {
      const status = req.query.status;
      const search = req.query.search || "";

      let query = {};

      // 1. Filter by Status (pending, verified, rejected)
      if (status) {
        query.status = status;
      }

      // 2. Search by Name or Location (Case Insensitive)
      if (search) {
        query.$or = [
          { restaurantName: { $regex: search, $options: "i" } },
          { location: { $regex: search, $options: "i" } },
        ];
      }

      const result = await restaurantsCollection.find(query).toArray();
      res.send(result);
    });

    // GET: Featured Restaurants (Verified Only)
    app.get("/restaurants/featured", async (req, res) => {
      const result = await restaurantsCollection
        .find({ status: "verified" })
        .limit(10)
        .toArray();
      res.send(result);
    });

    // GET: Single Restaurant Details with Menu
    app.get("/restaurants/:id", async (req, res) => {
      const id = req.params.id;

      // 1. Get Restaurant Info
      const restaurant = await restaurantsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!restaurant) {
        return res.status(404).send({ message: "Restaurant not found" });
      }

      // 2. Get Menu Items for this Restaurant
      // Assuming menu items have 'restaurantId' or 'sellerEmail'
      // Using 'sellerEmail' is safer if you linked it that way
      const menu = await menuCollection
        .find({ sellerEmail: restaurant.ownerEmail })
        .toArray();

      res.send({ restaurant, menu });
    });

    // DELETE Restaurant (Admin Only)
    app.delete(
      "/restaurants/:id",
      verifyFBToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await restaurantsCollection.deleteOne(query);
        res.send(result);
      }
    );

    // get restaurant for seller
    app.get("/restaurants/seller/:email", verifyFBToken, async (req, res) => {
      const email = req.params.email;
      const query = { ownerEmail: email };
      const result = await restaurantsCollection.findOne(query);
      res.send(result);
    });

    app.get("/restaurants", async (req, res) => {
      const { status } = req.query;
      const query = { status: status };
      const result = await restaurantsCollection
        .find(query)
        .sort({ appliedDate: -1 })
        .toArray();
      res.status(200).json(result);
    });

    // GET: Check if user has an existing restaurant application
    app.get("/restaurants/status/:email", verifyFBToken, async (req, res) => {
      const email = req.params.email;
      const query = { ownerEmail: email };
      // Find the most recent application (if multiple allowed, otherwise findOne is fine)
      const result = await restaurantsCollection.findOne(query);
      res.send(result || { status: null }); // Send null status if no application found
    });

    app.post("/restaurants", async (req, res) => {
      const sellerRequest = req.body;

      // Check if a rejected application exists for this email
      const existing = await restaurantsCollection.findOne({
        ownerEmail: sellerRequest.ownerEmail,
      });

      if (existing) {
        // If pending or verified, don't let them apply again
        if (existing.status === "pending" || existing.status === "verified") {
          return res.send({
            isExits: true,
            message: "Application already exists",
          });
        }

        // If rejected, UPDATE the existing document instead of inserting new
        if (existing.status === "rejected") {
          const filter = { ownerEmail: sellerRequest.ownerEmail };
          const updateDoc = { $set: sellerRequest }; // Update with new data
          const result = await restaurantsCollection.updateOne(
            filter,
            updateDoc
          );
          return res.send({ insertedId: result.modifiedCount }); // Mimic insert response
        }
      }

      // Standard Insert for new users
      const result = await restaurantsCollection.insertOne(sellerRequest);
      res.send(result);
    });

    // 1. Approve Route (Existing - kept as is)
    app.patch(
      "/restaurants/verify/:id",
      verifyFBToken,
      verifyAdmin,
      async (req, res) => {
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
      }
    );

    // 2. Reject Route (NEW)
    app.patch(
      "/restaurants/reject/:id",
      verifyFBToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const { reason } = req.body; // Admin sends the reason

        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            status: "rejected",
            rejectionReason:
              reason || "Application does not meet requirements.",
          },
        };

        const result = await restaurantsCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    // GET: All Categories (Public)
    // We join with 'menu' collection to get the real count of items!
    app.get("/categories", async (req, res) => {
      const result = await categoriesCollection
        .aggregate([
          {
            $lookup: {
              from: "menu", // Join with menu collection
              localField: "name", // Category name (e.g. "Burger")
              foreignField: "category", // Menu category field
              as: "foods",
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              image: 1,
              count: { $size: "$foods" }, // Count how many foods matched
            },
          },
        ])
        .toArray();

      res.send(result);
    });

    // POST: Add New Category (Admin Only)
    app.post("/categories", verifyFBToken, verifyAdmin, async (req, res) => {
      const category = req.body; // { name: "Pizza", image: "url" }
      const result = await categoriesCollection.insertOne(category);
      res.send(result);
    });

    // DELETE: Category (Admin Only)
    app.delete(
      "/categories/:id",
      verifyFBToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const result = await categoriesCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      }
    );

    // GET: Trending Foods (Sorted by Review Count or Rating)
    app.get("/foods/trending", async (req, res) => {
      const result = await menuCollection
        .find()
        .sort({ reviewCount: -1 }) // Sort by most reviewed
        .limit(8) // Get top 8 items
        .toArray();

      res.send(result);
    });

    // GET: Top Rated Foods (Limit 8)
    app.get("/foods/top-rated", async (req, res) => {
      const result = await menuCollection
        .find()
        .sort({ averageRating: -1 }) // Highest rating first
        .limit(4)
        .toArray();

      res.send(result);
    });

    // GET /all-foods with Search, Filter, Sort, Pagination
    app.get("/all-foods", async (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 9;
      const skip = (page - 1) * limit;

      const search = req.query.search || "";
      const category = req.query.category || "";
      const minPrice = parseInt(req.query.minPrice) || 0;
      const maxPrice = parseInt(req.query.maxPrice) || 10000;
      const sort = req.query.sort || "newest";

      let query = {
        name: { $regex: search, $options: "i" },
        price: { $gte: minPrice, $lte: maxPrice },
      };

      if (category && category !== "All") {
        query.category = category;
      }

      // Sorting Logic
      let sortOptions = {};
      if (sort === "price-asc") sortOptions = { price: 1 };
      else if (sort === "price-desc") sortOptions = { price: -1 };
      else sortOptions = { _id: -1 };

      const result = await menuCollection
        .find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await menuCollection.countDocuments(query);

      res.send({ result, total });
    });

    // GET: Single Menu Item + Restaurant Details
    app.get("/menu/:id", async (req, res) => {
      try {
        const id = req.params.id;
        console.log(id);

        // 1. Find the Food Item
        const foodQuery = { _id: new ObjectId(id) };
        const foodItem = await menuCollection.findOne(foodQuery);

        if (!foodItem) {
          return res.status(404).send({ message: "Food item not found" });
        }

        // 2. Find the Restaurant Details using the 'restaurantId' from the food item
        // We assume foodItem.restaurantId is stored as a string or ObjectId
        const restaurantQuery = { _id: new ObjectId(foodItem.restaurantId) };
        const restaurant = await restaurantsCollection.findOne(restaurantQuery);

        // 3. Combine them into one object
        const result = {
          ...foodItem, // Spread all food properties (name, price, image, etc.)
          restaurant: restaurant || {}, // Add a new property 'restaurant' with the details
        };

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Error fetching details" });
      }
    });

    // Get foods by seller email
    app.get(
      "/menu/seller/:email",
      verifyFBToken,
      verifySeller,
      async (req, res) => {
        const email = req.params.email;
        const { limit = 0, sort } = req.query;
        let sortOptions = {};
        if (sort) {
          sortOptions = { price: -1 };
        }
        if (email !== req.token_email) {
          return res.status(403).send({ message: "Forbidden access" });
        }
        const query = { sellerEmail: email };
        const result = await menuCollection
          .find(query)
          .limit(Number(limit))
          .sort(sortOptions)
          .toArray();

        res.send(result);
      }
    );

    // POST: Add a new Food Item (Seller Only)
    app.post("/menu", verifyFBToken, verifySeller, async (req, res) => {
      try {
        const item = req.body;
        const email = req.token_email; // Get email from the valid token

        // 1. Find the restaurant associated with this Seller
        const restaurant = await restaurantsCollection.findOne({
          ownerEmail: email,
        });

        if (!restaurant) {
          return res.status(404).send({
            message: "Restaurant not found. Please register as a seller first.",
          });
        }

        // 2. Construct the Food Object
        // We strictly take the restaurantId from the database, not the frontend, for security.
        const newItem = {
          name: item.name,
          price: parseFloat(item.price), // Ensure it's stored as a Number
          category: item.category,
          description: item.description,
          image: item.image,

          // Auto-filled System Fields
          restaurantId: restaurant._id.toString(),
          restaurantName: restaurant.restaurantName,
          sellerEmail: email,
          addedAt: new Date(),

          // Default Stats
          reviewCount: 0,
          averageRating: 0,
        };

        const result = await menuCollection.insertOne(newItem);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add food item" });
      }
    });

    // update food
    app.patch("/menu/:id", verifyFBToken, verifySeller, async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: item.name,
          category: item.category,
          price: item.price,
          description: item.description,
          image: item.image,
        },
      };
      const result = await menuCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // Delete food (Only Seller can delete their own food)
    app.delete("/menu/:id", verifyFBToken, verifySeller, async (req, res) => {
      const id = req.params.id;
      const email = req.token_email;

      const query = { _id: new ObjectId(id) };
      const food = await menuCollection.findOne(query);

      if (food.sellerEmail !== email) {
        return res.status(403).send({ message: "forbidden action" });
      }

      const result = await menuCollection.deleteOne(query);
      res.send(result);
    });

    //? Reviews Get Api
    // GET: Latest Reviews (Limit 4)
    app.get("/latest-reviews", async (req, res) => {
      try {
        const result = await reviewsCollection
          .aggregate([
            // 1. Sort by Newest first
            { $sort: { postedAt: -1 } },

            // 2. Limit to 4 items
            { $limit: 4 },

            // 3. Prepare ID for Lookup
            {
              $addFields: {
                restaurantObjId: { $toObjectId: "$restaurantId" },
              },
            },

            // 4. Lookup Restaurant Info
            {
              $lookup: {
                from: "restaurants",
                localField: "restaurantObjId",
                foreignField: "_id",
                as: "resDetails",
              },
            },

            // 5. Unwind
            {
              $unwind: {
                path: "$resDetails",
                preserveNullAndEmptyArrays: true,
              },
            },

            // 6. Project (Optimize Data)
            {
              $project: {
                _id: 1,
                foodName: 1,
                reviewText: 1,
                rating: 1,
                postedAt: 1,
                reviewerName: 1,
                reviewerPhoto: 1,
                photo: 1,
                restaurantId: 1,

                // Flattened Details
                restaurantName: "$resDetails.restaurantName",
                location: "$resDetails.location",
              },
            },
          ])
          .toArray();

        res.status(200).send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Error fetching latest reviews" });
      }
    });
    // GET /all-reviews with Search, Filter, Sort, Pagination
    app.get("/all-reviews", async (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 8;
      const skip = (page - 1) * limit;

      const search = req.query.search || "";
      const rating = req.query.rating;
      const sort = req.query.sort || "newest";

      let matchQuery = {
        $or: [
          { foodName: { $regex: search, $options: "i" } },
          { reviewText: { $regex: search, $options: "i" } },
        ],
      };

      if (rating && rating !== "All") {
        matchQuery.rating = { $gte: parseInt(rating) };
      }

      let sortOptions = {};
      if (sort === "newest") sortOptions = { postedAt: -1 };
      else if (sort === "oldest") sortOptions = { postedAt: 1 };
      else if (sort === "rating-desc") sortOptions = { rating: -1 };
      else if (sort === "rating-asc") sortOptions = { rating: 1 };

      try {
        const result = await reviewsCollection
          .aggregate([
            // 1. Filter
            { $match: matchQuery },

            // 2. Sort
            { $sort: sortOptions },

            // 3. Pagination
            { $skip: skip },
            { $limit: limit },

            // 4. Prepare ID for Lookup (Assuming restaurantId is a String in reviews)
            {
              $addFields: {
                restaurantObjId: { $toObjectId: "$restaurantId" },
              },
            },

            // 5. Lookup (Join)
            {
              $lookup: {
                from: "restaurants",
                localField: "restaurantObjId",
                foreignField: "_id",
                as: "resDetails",
              },
            },

            // 6. Unwind (Flatten array)
            {
              $unwind: {
                path: "$resDetails",
                preserveNullAndEmptyArrays: true,
              },
            },

            // 7. Project (The Optimization Step)
            // We explicitly pick ONLY what we need.
            {
              $project: {
                _id: 1,
                foodName: 1,
                reviewText: 1,
                rating: 1,
                postedAt: 1,
                reviewerName: 1,
                reviewerPhoto: 1,
                photo: 1, // Food/Review Photo
                restaurantId: 1, // Original ID from review

                // Extract ONLY these two fields from the joined restaurant data
                restaurantName: "$resDetails.restaurantName",
                location: "$resDetails.location",
              },
            },
          ])
          .toArray();

        const total = await reviewsCollection.countDocuments(matchQuery);

        res.send({ result, total });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Error fetching reviews" });
      }
    });

    // GET: Single Review Details with Restaurant Info
    app.get("/reviews/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await reviewsCollection
          .aggregate([
            // 1. Find the specific review
            { $match: { _id: new ObjectId(id) } },

            // 2. Prepare ID for Lookup
            {
              $addFields: {
                restaurantObjId: { $toObjectId: "$restaurantId" },
              },
            },

            // 3. Lookup Restaurant Info
            {
              $lookup: {
                from: "restaurants",
                localField: "restaurantObjId",
                foreignField: "_id",
                as: "resDetails",
              },
            },

            // 4. Unwind
            {
              $unwind: {
                path: "$resDetails",
                preserveNullAndEmptyArrays: true,
              },
            },

            // 5. Project (Flatten the structure)
            {
              $project: {
                _id: 1,
                foodName: 1,
                reviewText: 1,
                rating: 1,
                postedAt: 1,
                reviewerName: 1,
                reviewerEmail: 1,
                reviewerPhoto: 1,
                photo: 1,
                restaurantId: 1,

                // Add the extra fields directly to the root object
                restaurantName: "$resDetails.restaurantName",
                location: "$resDetails.location",
              },
            },
          ])
          .toArray();

        // Aggregate returns an array, but we want a single object
        if (result.length === 0) {
          return res.status(404).send({ message: "Review not found" });
        }

        res.status(200).send(result[0]);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Error fetching review details" });
      }
    });

    // my reviews api
    app.get("/my-reviews", verifyFBToken, async (req, res) => {
      const email = req.query.email;

      const limit = req.query.limit;
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
        .limit(Number(limit))
        .toArray();
      res.status(200).send(result);
    });

    // GET All Reviews (Admin View - with search)
    app.get("/admin/reviews", verifyFBToken, verifyAdmin, async (req, res) => {
      const search = req.query.search || "";
      const query = {
        $or: [
          { foodTitle: { $regex: search, $options: "i" } },
          { reviewerEmail: { $regex: search, $options: "i" } },
        ],
      };
      const result = await reviewsCollection
        .find(query)
        .sort({ postedAt: -1 })
        .toArray();
      res.send(result);
    });

    // DELETE Review (Admin Power)
    app.delete(
      "/admin/reviews/:id",
      verifyFBToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await reviewsCollection.deleteOne(query);
        res.send(result);
      }
    );

    //? Reviews POST Api
    app.post("/reviews", verifyFBToken, async (req, res) => {
      const newReview = req.body;
      const tokenEmail = req.token_email;

      if (tokenEmail === newReview.reviewerEmail) {
        const result = await reviewsCollection.insertOne({
          ...newReview,
        });

        // update the mune
        await menuCollection.updateOne(
          { _id: new ObjectId(newReview.menuId) },
          [
            {
              $set: {
                totalReviews: { $add: ["$totalReviews", 1] },
                averageRating: {
                  $divide: [
                    {
                      $add: [
                        { $multiply: ["$averageRating", "$totalReviews"] },
                        newReview.rating,
                      ],
                    },
                    { $add: ["$totalReviews", 1] },
                  ],
                },
              },
            },
          ]
        );
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

    // admin analytic or stats page
    app.get("/admin-stats", verifyFBToken, verifyAdmin, async (req, res) => {
      // 1. Basic Counts
      const users = await usersCollection.estimatedDocumentCount();
      const menuItems = await menuCollection.estimatedDocumentCount();
      const reviews = await reviewsCollection.estimatedDocumentCount();
      const sellers = await usersCollection.countDocuments({ role: "seller" });
      const pendingSellers = await restaurantsCollection.countDocuments({
        status: "pending",
      });

      // 2. Chart Data (Category Distribution)
      // Example: How many foods in each category?
      const chartData = await menuCollection
        .aggregate([
          {
            $group: {
              _id: "$category",
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              name: "$_id",
              count: 1,
              _id: 0,
            },
          },
        ])
        .toArray();

      res.send({
        users,
        menuItems,
        reviews,
        sellers,
        pendingSellers,
        chartData,
      });
    });

    // GET Seller Stats & Recent Reviews
    app.get(
      "/seller-stats/:email",
      verifyFBToken,
      verifySeller,
      async (req, res) => {
        const email = req.params.email;

        // Security Check
        if (email !== req.token_email)
          return res.status(403).send({ message: "forbidden" });

        const restaurant = await restaurantsCollection.findOne({
          ownerEmail: email,
        });
        const myFoods = await menuCollection
          .find({ sellerEmail: email })
          .toArray();

        const myFoodIds = myFoods.map((food) => food._id.toString());

        const stats = await reviewsCollection
          .aggregate([
            {
              $match: {
                menuId: { $in: myFoodIds },
              },
            },
            {
              $group: {
                _id: null,
                totalReviews: { $sum: 1 },
                avgRating: { $avg: "$rating" },
              },
            },
          ])
          .toArray();

        const recentReviews = await reviewsCollection
          .find({
            menuId: { $in: myFoodIds },
          })
          .sort({ postedAt: -1 })
          .limit(3)
          .toArray();

        const reviewStats = stats[0] || { totalReviews: 0, avgRating: 0 };

        res.send({
          restaurantName: restaurant?.name,
          foodCount: myFoods.length,
          totalReviews: reviewStats.totalReviews,
          avgRating: reviewStats.avgRating.toFixed(1),
          recentReviews,
        });
      }
    );

    // post apis
    // GET: Latest Community Posts (Limit 3)
    app.get("/posts/latest", async (req, res) => {
      const result = await postsCollection
        .find()
        .sort({ date: -1 }) // Newest first
        .limit(3)
        .toArray();

      res.send(result);
    });
    // POST a new community post
    app.post("/posts", verifyFBToken, async (req, res) => {
      const post = req.body;
      // post body: { userEmail, userName, userPhoto, image, caption, likes: [], date }
      const result = await postsCollection.insertOne(post);
      res.send(result);
    });

    // GET all posts (Sorted by newest)
    app.get("/posts", async (req, res) => {
      const result = await postsCollection.find().sort({ date: -1 }).toArray();
      res.send(result);
    });

    // PATCH Like a post
    app.patch("/posts/like/:id", verifyFBToken, async (req, res) => {
      const id = req.params.id;
      const email = req.token_email;
      const filter = { _id: new ObjectId(id) };

      // Check if already liked logic needs to be handled
      // Simple toggle logic:
      const post = await postsCollection.findOne(filter);
      const isLiked = post.likes.includes(email);

      let updateDoc;
      if (isLiked) {
        updateDoc = { $pull: { likes: email } }; // Unlike
      } else {
        updateDoc = { $addToSet: { likes: email } }; // Like
      }

      const result = await postsCollection.updateOne(filter, updateDoc);
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
