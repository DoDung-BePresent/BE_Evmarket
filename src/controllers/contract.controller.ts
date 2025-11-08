/* eslint-disable no-unsafe-optional-chaining */
/**
 * Middlewares
 */
import { asyncHandler } from "@/middlewares/error.middleware";

/**
 * Services
 */
import { contractService } from "@/services/contract.service";

/**
 * Constants
 */
import { STATUS_CODE } from "@/constants/error.constant";

export const contractController = {
  getContract: asyncHandler(async (req, res) => {
    const { transactionId } = req.validated?.params;
    const { id: userId } = req.user!;

    const signedUrl = await contractService.getContractSignedUrl(
      transactionId,
      userId,
    );

    res.status(STATUS_CODE.OK).json({
      message: "Contract URL fetched successfully",
      data: { url: signedUrl },
    });
  }),
};
