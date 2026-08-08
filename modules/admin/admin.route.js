import { Router } from "express";
import * as adminController from "./admin.controller.js";
import verifyFBToken from "../../middlewares/verifyFBToken.js";
import verifyAdmin from "../../middlewares/verifyAdmin.js";
import verifySeller from "../../middlewares/verifySeller.js";

const router = Router();

// GET All Reviews (Admin View - with search)
router.get("/admin/reviews", verifyFBToken, verifyAdmin, adminController.getReviews);

// DELETE Review (Admin Power)
router.delete(
  "/admin/reviews/:id",
  verifyFBToken,
  verifyAdmin,
  adminController.deleteReview,
);

// admin analytic or stats page
router.get("/admin-stats", verifyFBToken, verifyAdmin, adminController.getStats);

// GET Seller Stats & Recent Reviews
router.get(
  "/seller-stats/:email",
  verifyFBToken,
  verifySeller,
  adminController.getSellerStats,
);

export default router;
