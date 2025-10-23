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

auctionRouter.get(
  "/live",
  validate(auctionValidation.getLiveAuctions),
  auctionController.getLiveAuctions,
);

auctionRouter.get(
  "/:listingType/:listingId",
  validate(auctionValidation.getAuctionDetails),
  auctionController.getAuctionDetails,
);

auctionRouter.use(authenticate);

auctionRouter.post(
  "/:listingType/:listingId/deposit",
  validate(auctionValidation.depositParams), // Cần tạo validation này
  auctionController.payAuctionDeposit,
);

auctionRouter.post(
  "/:listingType/:listingId/bids",
  validate(auctionValidation.placeBid),
  auctionController.placeBid,
);

auctionRouter.patch(
  "/listings/:listingType/:listingId/request-auction",
  validate(auctionValidation.requestAuction),
  auctionController.requestAuction,
);

export default auctionRouter;
