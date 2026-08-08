import { Router } from "express";
import * as categoryController from "./category.controller.js";
import verifyFBToken from "../../middlewares/verifyFBToken.js";
import verifyAdmin from "../../middlewares/verifyAdmin.js";

const router = Router();

// GET: All Categories (Public)
router.get("/categories", categoryController.getAll);

// POST: Add New Category (Admin Only)
router.post(
  "/categories",
  verifyFBToken,
  verifyAdmin,
  categoryController.add,
);

// DELETE: Category (Admin Only)
router.delete(
  "/categories/:id",
  verifyFBToken,
  verifyAdmin,
  categoryController.remove,
);

export default router;
