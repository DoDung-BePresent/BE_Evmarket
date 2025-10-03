import { Router } from "express";
import { authenticate } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { auctionController } from "@/controllers/auction.controller";
import { auctionValidation } from "@/validations/auction.validation";

const auctionRouter = Router();

auctionRouter.use(authenticate);

auctionRouter.post(
  "/vehicles/:listingId/bids",
  validate(auctionValidation.placeBid),
  auctionController.placeVehicleBid,
);

auctionRouter.post(
  "/batteries/:listingId/bids",
  validate(auctionValidation.placeBid),
  auctionController.placeBatteryBid,
);

export default auctionRouter;
