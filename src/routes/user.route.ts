/**
 * Node modules
 */
import { Router } from "express";

/**
 * Controllers
 */
import { userController } from "@/controllers/user.controller";

const userRouter = Router();

userRouter.get("/me", userController.getMe);

export default userRouter;
