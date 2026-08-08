import { Router } from "express";
import * as restaurantController from "./restaurant.controller.js";
import verifyFBToken from "../../middlewares/verifyFBToken.js";
import verifyAdmin from "../../middlewares/verifyAdmin.js";

const router = Router();

// GET Restaurants (Support Status Filter & Search)
router.get("/restaurants", restaurantController.getAll);

// GET: Featured Restaurants (Verified Only)
router.get("/restaurants/featured", restaurantController.getFeatured);

// GET: Restaurant for Seller
router.get(
  "/restaurants/seller/:email",
  verifyFBToken,
  restaurantController.getSellerRestaurant,
);

// GET: Check if user has an existing restaurant application
router.get(
  "/restaurants/status/:email",
  verifyFBToken,
  restaurantController.getStatus,
);

// GET: Single Restaurant Details with Menu
router.get("/restaurants/:id", restaurantController.getById);

// POST: Apply for Restaurant
router.post("/restaurants", restaurantController.apply);

// PATCH: Approve Restaurant (Admin Only)
router.patch(
  "/restaurants/verify/:id",
  verifyFBToken,
  verifyAdmin,
  restaurantController.verify,
);

// PATCH: Reject Restaurant (Admin Only)
router.patch(
  "/restaurants/reject/:id",
  verifyFBToken,
  verifyAdmin,
  restaurantController.reject,
);

// DELETE Restaurant (Admin Only)
router.delete(
  "/restaurants/:id",
  verifyFBToken,
  verifyAdmin,
  restaurantController.remove,
);

export default router;
