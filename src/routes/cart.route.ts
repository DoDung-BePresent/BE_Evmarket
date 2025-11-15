import { Router } from "express";
import { authenticate } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { cartController } from "@/controllers/cart.controller";
import { cartValidation } from "@/validations/cart.validation";

const cartRouter = Router();

cartRouter.use(authenticate);

cartRouter.get("/", cartController.getCart);

cartRouter.post(
  "/items",
  validate(cartValidation.addToCart),
  cartController.addToCart,
);

cartRouter.delete(
  "/items/:itemId",
  validate(cartValidation.removeFromCart),
  cartController.removeFromCart,
);

export default cartRouter;
