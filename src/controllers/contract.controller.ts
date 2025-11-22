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
  viewContract: asyncHandler(async (req, res) => {
    const { transactionId } = req.validated?.params;
    const { id: userId } = req.user!;
    const html = await contractService.renderContractAsHtml(
      transactionId,
      userId,
    );
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  }),

  // HÀM MỚI: Tải PDF
  downloadContract: asyncHandler(async (req, res) => {
    const { transactionId } = req.validated?.params;
    const { id: userId } = req.user!;
    const signedUrl = await contractService.generateAndDownloadContract(
      transactionId,
      userId,
    );
    // Chuyển hướng người dùng đến URL tải xuống
    res.redirect(signedUrl);
  }),
  
  getContractUrl: asyncHandler(async (req, res) => {
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
