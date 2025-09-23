/**
 * Libs
 */
import prisma from "@/libs/prisma";
import { comparePassword, hashPassword } from "@/libs/crypto";
import { BadRequestError, ConflictError } from "@/libs/error";

/**
 * Constants
 */
import { ERROR_CODE_ENUM } from "@/constants/error.constant";
import { LoginPayload, RegisterPayload } from "@/validations/auth.validation";

export const authService = {
  // TODO: Apply verify email
  register: async ({ email, password, name }: RegisterPayload) => {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError(
        "Email already exists",
        ERROR_CODE_ENUM.USER_ALREADY_EXISTS,
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        accounts: {
          create: {
            type: "CREDENTIALS",
            provider: "CREDENTIALS",
            providerAccountId: email,
            password: hashedPassword,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  },
  login: async ({ email, password }: LoginPayload) => {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: true,
      },
    });

    if (!existingUser) {
      throw new BadRequestError(
        "Invalid email or password",
        ERROR_CODE_ENUM.INVALID_CREDENTIALS,
      );
    }

    const credentialsAccount = existingUser.accounts.find(
      (acc) => acc.provider === "CREDENTIALS",
    );

    if (!credentialsAccount || !credentialsAccount.password) {
      throw new BadRequestError(
        "This account was created using a different method. Please log in with your social account",
        ERROR_CODE_ENUM.ACCOUNT_EXISTS_WITH_DIFFERENT_PROVIDER,
      );
    }

    const isMatchPassword = await comparePassword(
      password,
      credentialsAccount.password,
    );

    if (!isMatchPassword) {
      throw new BadRequestError(
        "Invalid email or password",
        ERROR_CODE_ENUM.INVALID_CREDENTIALS,
      );
    }

    const { accounts, ...user } = existingUser;

    return user;
  },
};
