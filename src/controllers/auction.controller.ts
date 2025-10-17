/* eslint-disable no-unsafe-optional-chaining */

/**
 * Node modules
 */
import { ListingType } from "@prisma/client";

/**
 * Constants
 */
import { STATUS_CODE } from "@/constants/error.constant";

/**
 * Middlewares
 */
import { asyncHandler } from "@/middlewares/error.middleware";

/**
 * Services
 */
import { auctionService } from "@/services/auction.service";

export const auctionController = {
  requestAuction: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const { listingType, listingId } = req.validated?.params;
    const listing = await auctionService.requestAuction(
      userId,
      listingType,
      listingId,
      req.validated?.body,
    );
    res.status(STATUS_CODE.OK).json({
      message:
        "Auction request submitted successfully. Please wait for approval.",
      data: listing,
    });
  }),
  placeVehicleBid: asyncHandler(async (req, res) => {
    const { id: bidderId } = req.user!;
    const { listingId } = req.validated?.params;
    const { amount } = req.validated?.body;

    const newBid = await auctionService.placeBid({
      listingType: ListingType.VEHICLE,
      listingId,
      bidderId,
      amount,
    });

    res.status(STATUS_CODE.CREATED).json({
      message: "Bid placed successfully",
      data: newBid,
    });
  }),

  placeBatteryBid: asyncHandler(async (req, res) => {
    const { id: bidderId } = req.user!;
    const { listingId } = req.validated?.params;
    const { amount } = req.validated?.body;

    const newBid = await auctionService.placeBid({
      listingType: ListingType.BATTERY,
      listingId,
      bidderId,
      amount,
    });

    res.status(STATUS_CODE.CREATED).json({
      message: "Bid placed successfully",
      data: newBid,
    });
  }),
};
