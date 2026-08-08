import { Router } from "express";
import * as menuController from "./menu.controller.js";
import verifyFBToken from "../../middlewares/verifyFBToken.js";
import verifySeller from "../../middlewares/verifySeller.js";

const router = Router();

// GET: Trending Foods (Sorted by Review Count)
router.get("/foods/trending", menuController.getTrending);

// GET: Top Rated Foods (Limit 8)
router.get("/foods/top-rated", menuController.getTopRated);

// GET /all-foods with Search, Filter, Sort, Pagination
router.get("/all-foods", menuController.getAll);

// GET: Seller's Menu Items
router.get(
  "/menu/seller/:email",
  verifyFBToken,
  verifySeller,
  menuController.getSellerMenu,
);

// GET: Single Menu Item + Restaurant Details
router.get("/menu/:id", menuController.getById);

// POST: Add a new Food Item (Seller Only)
router.post("/menu", verifyFBToken, verifySeller, menuController.addFood);

// PATCH: Update Food (Seller Only)
router.patch(
  "/menu/:id",
  verifyFBToken,
  verifySeller,
  menuController.updateFood,
);

// DELETE: Delete Food (Seller Only)
router.delete(
  "/menu/:id",
  verifyFBToken,
  verifySeller,
  menuController.deleteFood,
);

export default router;
