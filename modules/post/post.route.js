import { Router } from "express";
import * as postController from "./post.controller.js";
import verifyFBToken from "../../middlewares/verifyFBToken.js";

const router = Router();

// GET: Latest Community Posts (Limit 3)
router.get("/posts/latest", postController.getLatest);

// GET all posts (Sorted by newest)
router.get("/posts", postController.getAll);

// POST a new community post
router.post("/posts", verifyFBToken, postController.create);

// PATCH Like a post
router.patch("/posts/like/:id", verifyFBToken, postController.toggleLike);

export default router;
