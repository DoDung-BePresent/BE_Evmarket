import prisma from "@/libs/prisma";
import { ForbiddenError, NotFoundError, BadRequestError } from "@/libs/error";
import { IQueryOptions } from "@/types/pagination.type";

export const appointmentService = {
  proposeDate: async (
    userId: string,
    appointmentId: string,
    proposedDates: Date[],
  ) => {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundError("Appointment not found.");
    }

    if (appointment.buyerId !== userId && appointment.sellerId !== userId) {
      throw new ForbiddenError(
        "You are not authorized to modify this appointment.",
      );
    }

    if (appointment.status !== "PENDING") {
      throw new BadRequestError("This appointment cannot be modified.");
    }

    const isBuyer = appointment.buyerId === userId;
    // Ghi đè danh sách ngày đề xuất của người dùng hiện tại
    const dataToUpdate = isBuyer
      ? { buyerProposedDates: proposedDates }
      : { sellerProposedDates: proposedDates };

    // TODO: Gửi email/thông báo cho người còn lại về các ngày đã được đề xuất

    return prisma.appointment.update({
      where: { id: appointmentId },
      data: dataToUpdate,
    });
  },

  confirmDate: async (
    userId: string,
    appointmentId: string,
    confirmedDate: Date,
  ) => {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundError("Appointment not found.");
    }

    if (appointment.buyerId !== userId && appointment.sellerId !== userId) {
      throw new ForbiddenError(
        "You are not authorized to confirm this appointment.",
      );
    }

    if (appointment.status !== "PENDING") {
      throw new BadRequestError(
        "This appointment has already been confirmed or cancelled.",
      );
    }

    const isBuyer = appointment.buyerId === userId;
    const datesProposedByOtherParty = isBuyer
      ? appointment.sellerProposedDates
      : appointment.buyerProposedDates;

    if (datesProposedByOtherParty.length === 0) {
      throw new BadRequestError(
        "The other party has not proposed any dates yet.",
      );
    }

    // Kiểm tra xem ngày xác nhận có nằm trong danh sách đề xuất không
    const isValidDate = datesProposedByOtherParty.some(
      (proposedDate) => proposedDate.getTime() === confirmedDate.getTime(),
    );

    if (!isValidDate) {
      throw new BadRequestError(
        "The selected date is not in the list of proposed dates.",
      );
    }

    // Cập nhật trạng thái lịch hẹn và giao dịch trong cùng một transaction
    return prisma.$transaction(async (tx) => {
      const updatedAppointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "CONFIRMED",
          confirmedDate: confirmedDate, // Lưu ngày đã được xác nhận
        },
      });

      await tx.transaction.update({
        where: { id: updatedAppointment.transactionId },
        data: {
          status: "APPOINTMENT_SCHEDULED",
        },
      });

      // TODO: Gửi email/thông báo xác nhận lịch hẹn thành công cho cả 2 bên

      return updatedAppointment;
    });
  },

  getMyAppointments: async (userId: string, options: IQueryOptions) => {
    const {
      limit = 10,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;
    const skip = (page - 1) * limit;

    const where = {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    };

    const [appointments, totalResults] = await prisma.$transaction([
      prisma.appointment.findMany({
        where,
        include: {
          transaction: {
            select: {
              id: true,
              status: true,
              vehicle: { select: { title: true, images: true } },
            },
          },
          buyer: { select: { id: true, name: true, avatar: true } },
          seller: { select: { id: true, name: true, avatar: true } },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.appointment.count({ where }),
    ]);

    return {
      appointments,
      page,
      limit,
      totalPages: Math.ceil(totalResults / limit),
      totalResults,
    };
  },
};
