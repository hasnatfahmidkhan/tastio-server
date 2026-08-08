import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import express from "express";
import cors from "cors";
import "./config/firebase.js"; // Initialize Firebase (side-effect)

import userRoutes from "./modules/user/user.route.js";
import restaurantRoutes from "./modules/restaurant/restaurant.route.js";
import menuRoutes from "./modules/menu/menu.route.js";
import categoryRoutes from "./modules/category/category.route.js";
import reviewRoutes from "./modules/review/review.route.js";
import favouriteRoutes from "./modules/favourite/favourite.route.js";
import postRoutes from "./modules/post/post.route.js";
import adminRoutes from "./modules/admin/admin.route.js";

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get("/", (req, res) => {
  res.send("Tastio server is running");
});

// Mount Modules
app.use(userRoutes);
app.use(restaurantRoutes);
app.use(menuRoutes);
app.use(categoryRoutes);
app.use(reviewRoutes);
app.use(favouriteRoutes);
app.use(postRoutes);
app.use(adminRoutes);

export default app;
