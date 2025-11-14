import { Router } from "express";

/**
 * Middlewares
 */
import { authenticate } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { uploadImages } from "@/middlewares/upload.middleware";

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

auctionRouter.use(authenticate);

auctionRouter.post(
  "/vehicles",
  uploadImages,
  validate(auctionValidation.createVehicleAuction),
  auctionController.createAuction,
);

auctionRouter.post(
  "/batteries",
  uploadImages,
  validate(auctionValidation.createBatteryAuction),
  auctionController.createAuction,
);

auctionRouter.get(
  "/:listingType/:listingId",
  validate(auctionValidation.getAuctionDetails),
  auctionController.getAuctionDetails,
);

auctionRouter.post(
  "/:listingType/:listingId/buy-now",
  validate(auctionValidation.getAuctionDetails),
  auctionController.buyNow,
);

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
