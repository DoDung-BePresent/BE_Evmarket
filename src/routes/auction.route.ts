import { Router } from "express";

/**
 * Middlewares
 */
import { authenticate } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate.middleware";

/**
 * Controllers
 */
import { auctionController } from "@/controllers/auction.controller";

/**
 * Validations
 */
import { auctionValidation } from "@/validations/auction.validation";

const auctionRouter = Router();

auctionRouter.use(authenticate);

auctionRouter.post(
  "/vehicles/:listingId/bids",
  validate(auctionValidation.placeBid),
  auctionController.placeVehicleBid,
);

auctionRouter.patch(
  "/listings/:listingType/:listingId/request-auction",
  validate(auctionValidation.requestAuction),
  auctionController.requestAuction,
);

auctionRouter.post(
  "/batteries/:listingId/bids",
  validate(auctionValidation.placeBid),
  auctionController.placeBatteryBid,
);

export default auctionRouter;
