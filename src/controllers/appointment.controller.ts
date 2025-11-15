/* eslint-disable no-unsafe-optional-chaining */
import { STATUS_CODE } from "@/constants/error.constant";
import { asyncHandler } from "@/middlewares/error.middleware";
import { appointmentService } from "@/services/appointment.service";
import { IQueryOptions } from "@/types/pagination.type";
import { pick } from "@/utils/pick.util";

export const appointmentController = {
  proposeDate: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const { appointmentId } = req.validated?.params;
    const { proposedDate } = req.validated?.body;

    const appointment = await appointmentService.proposeDate(
      userId,
      appointmentId,
      new Date(proposedDate),
    );

    res.status(STATUS_CODE.OK).json({
      message:
        "Date proposed successfully. Waiting for the other party to confirm.",
      data: appointment,
    });
  }),

  confirmDate: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const { appointmentId } = req.validated?.params;

    const appointment = await appointmentService.confirmDate(
      userId,
      appointmentId,
    );

    res.status(STATUS_CODE.OK).json({
      message: "Appointment confirmed successfully.",
      data: appointment,
    });
  }),

  getMyAppointments: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const options = pick(req.validated?.query, [
      "sortBy",
      "sortOrder",
      "page",
      "limit",
    ]) as IQueryOptions;

    const result = await appointmentService.getMyAppointments(userId, options);

    res.status(STATUS_CODE.OK).json({
      message: "Appointments fetched successfully.",
      data: result,
    });
  }),
};
