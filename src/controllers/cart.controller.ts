/* eslint-disable no-unsafe-optional-chaining */
import { STATUS_CODE } from "@/constants/error.constant";
import { asyncHandler } from "@/middlewares/error.middleware";
import { cartService } from "@/services/cart.service";

export const cartController = {
  getCart: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const cart = await cartService.getOrCreateCart(userId);
    res.status(STATUS_CODE.OK).json({
      message: "Cart fetched successfully.",
      data: cart,
    });
  }),

  addToCart: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const { batteryId } = req.validated?.body;
    const cartItem = await cartService.addToCart(userId, batteryId);
    res.status(STATUS_CODE.CREATED).json({
      message: "Item added to cart successfully.",
      data: cartItem,
    });
  }),

  removeFromCart: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const { itemId } = req.validated?.params;
    await cartService.removeFromCart(userId, itemId);
    res.status(STATUS_CODE.OK).json({
      message: "Item removed from cart successfully.",
    });
  }),
};
