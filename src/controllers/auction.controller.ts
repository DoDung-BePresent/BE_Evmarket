/* eslint-disable no-unsafe-optional-chaining */
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

/**
 * Utils
 */
import { pick } from "@/utils/pick.util";

/**
 * Validations
 */
import { GetLiveAuctionsQuery } from "@/validations/auction.validation";

export const auctionController = {
  payAuctionDeposit: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const { listingType, listingId } = req.validated?.params;
    const deposit = await auctionService.payAuctionDeposit(
      userId,
      listingType,
      listingId,
    );
    res.status(STATUS_CODE.CREATED).json({
      message: "Deposit paid successfully. You can now place bids.",
      data: deposit,
    });
  }),
  getLiveAuctions: asyncHandler(async (req, res) => {
    const query = req.validated?.query as GetLiveAuctionsQuery;
    const options = pick(query, [
      "sortBy",
      "sortOrder",
      "limit",
      "page",
      "time",
    ]);
    const result = await auctionService.queryLiveAuctions(options);
    res.status(STATUS_CODE.OK).json({
      message: "Live auctions fetched successfully",
      data: result,
    });
  }),
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
  placeBid: asyncHandler(async (req, res) => {
    const { id: bidderId } = req.user!;
    const { listingId, listingType } = req.validated?.params;
    const { amount } = req.validated?.body;

    const newBid = await auctionService.placeBid({
      listingType,
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
