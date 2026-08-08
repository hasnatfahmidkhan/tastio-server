import { Router } from "express";
import * as favouriteController from "./favourite.controller.js";
import verifyFBToken from "../../middlewares/verifyFBToken.js";

const router = Router();

// get favourite review
router.get("/favourites", verifyFBToken, favouriteController.getAll);

// favourite review
router.post("/favourites", verifyFBToken, favouriteController.add);

// delete favourite review
router.delete("/favourites/:id", verifyFBToken, favouriteController.remove);

export default router;
