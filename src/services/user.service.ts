/**
 * Libs
 */
import prisma from "@/libs/prisma";
import { NotFoundError } from "@/libs/error";

export const userService = {
  getUserById: async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  },
};
