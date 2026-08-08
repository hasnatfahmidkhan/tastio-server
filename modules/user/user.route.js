import { Router } from "express";
import * as userController from "./user.controller.js";
import verifyFBToken from "../../middlewares/verifyFBToken.js";
import verifyAdmin from "../../middlewares/verifyAdmin.js";

const router = Router();

// GET User Profile Stats
router.get("/users/profile/:email", verifyFBToken, userController.getProfile);

// GET All Users (with Search & Role Filter) - Admin Only
router.get("/users", verifyFBToken, verifyAdmin, userController.getAllUsers);

// PATCH: Update User Profile
router.patch("/users/:email", verifyFBToken, userController.updateProfile);

// PATCH Update User Role - Admin Only
router.patch(
  "/users/role/:id",
  verifyFBToken,
  verifyAdmin,
  userController.updateRole,
);

// DELETE User - Admin Only
router.delete(
  "/users/:id",
  verifyFBToken,
  verifyAdmin,
  userController.deleteUser,
);

// GET User Role
router.get("/users/:email/role", userController.getRole);

// POST: Create User
router.post("/users", userController.createUser);

export default router;
