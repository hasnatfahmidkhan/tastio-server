import { Router } from "express";
import * as reviewController from "./review.controller.js";
import verifyFBToken from "../../middlewares/verifyFBToken.js";

const router = Router();

// GET: Latest Reviews (Limit 4)
router.get("/latest-reviews", reviewController.getLatest);

// GET /all-reviews with Search, Filter, Sort, Pagination
router.get("/all-reviews", reviewController.getAll);

// GET: Single Review Details with Restaurant Info
router.get("/reviews/:id", reviewController.getById);

// my reviews api
router.get("/my-reviews", verifyFBToken, reviewController.getMyReviews);

// Reviews POST Api
router.post("/reviews", verifyFBToken, reviewController.create);

// update review
router.patch("/reviews/:id", verifyFBToken, reviewController.update);

// delete review
router.delete("/my-reviews/:id", verifyFBToken, reviewController.remove);

// leaderboard for reviewers
router.get("/leaderboard", reviewController.getLeaderboard);

export default router;
