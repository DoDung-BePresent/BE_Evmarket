/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
/**
 * Node modules
 */
import axios from "axios";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";

/**
 * Configs
 */
import config from "@/configs/env.config";

/**
 * Services
 */
import { walletService } from "@/services/wallet.service";

/**
 * Constants
 */
import { ERROR_CODE_ENUM } from "@/constants/error.constant";

/**
 * Validations
 */
import { SUPABASE_BUCKETS } from "@/constants/supabase.constant";
import { LoginPayload, RegisterPayload } from "@/validations/auth.validation";

/**
 * Services
 */
import { emailService } from "@/services/email.service";

/**
 * Libs
 */
import prisma from "@/libs/prisma";
import redisClient from "@/libs/redis";
import { supabase } from "@/libs/supabase";
import { generateTokens } from "@/libs/jwt";
import { compressImage } from "@/libs/compress";
import { comparePassword, hashPassword } from "@/libs/crypto";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from "@/libs/error";
import logger from "@/libs/logger";

const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

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

    await walletService.createWallet(user.id);

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

    if (existingUser.isLocked) {
      throw new ForbiddenError(
        `Your account has been locked. Reason: ${
          existingUser.lockReason || "No reason provided."
        }`,
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
  oauthLogin: async ({
    provider,
    providerAccountId,
    email,
    name,
    avatarUrl,
  }: {
    provider: "GOOGLE";
    providerAccountId: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  }) => {
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: { provider, providerAccountId } as any,
      },
      include: { user: true },
    });

    if (existingAccount?.user) {
      return existingAccount.user;
    }

    let user = email
      ? await prisma.user.findUnique({ where: { email } })
      : null;

    if (!user) {
      let avatarPublicUrl: string | undefined;
      if (avatarUrl) {
        const resp = await axios.get(avatarUrl, {
          responseType: "arraybuffer",
        });
        const rawBuffer: Buffer = Buffer.from(resp.data, "binary");

        const compressedBuffer = await compressImage(rawBuffer, {
          width: 512,
          format: "jpeg",
          quality: 80,
        });

        const fileName = `${SUPABASE_BUCKETS.AVATARS}/${Date.now()}-${provider}-${providerAccountId}.jpg`;
        const { error } = await supabase.storage
          .from(SUPABASE_BUCKETS.AVATARS)
          .upload(fileName, compressedBuffer, { contentType: "image/jpeg" });

        if (!error) {
          const { data } = supabase.storage
            .from(SUPABASE_BUCKETS.AVATARS)
            .getPublicUrl(fileName);
          avatarPublicUrl = data.publicUrl;
        }
      }

      user = await prisma.user.create({
        data: {
          email: email,
          name: name ?? undefined,
          avatar: avatarPublicUrl ?? undefined,
          accounts: {
            create: {
              type: "OAUTH",
              provider: provider as any,
              providerAccountId,
            },
          },
        },
      });

      await walletService.createWallet(user.id);

      return user;
    }
    await prisma.account.create({
      data: {
        userId: user.id,
        type: "OAUTH",
        provider: provider as any,
        providerAccountId,
      },
    });

    if (!user.avatar && avatarUrl) {
      const resp = await axios.get(avatarUrl, {
        responseType: "arraybuffer",
      });
      const rawBuffer: Buffer = Buffer.from(resp.data, "binary");

      const compressedBuffer = await compressImage(rawBuffer, {
        width: 512,
        format: "jpeg",
        quality: 80,
      });

      const fileName = `${SUPABASE_BUCKETS.AVATARS}/${Date.now()}-${provider}-${providerAccountId}.jpg`;
      const { error } = await supabase.storage
        .from(SUPABASE_BUCKETS.AVATARS)
        .upload(fileName, compressedBuffer, { contentType: "image/jpeg" });

      if (!error) {
        const { data } = supabase.storage
          .from(SUPABASE_BUCKETS.AVATARS)
          .getPublicUrl(fileName);
        await prisma.user.update({
          where: { id: user.id },
          data: { avatar: data.publicUrl },
        });
        user.avatar = data.publicUrl;
      }
    }

    return user;
  },
  verifyGoogleIdToken: async (idToken: string) => {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: config.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedError("Invalid Google token");
      }

      const {
        sub: providerAccountId,
        email,
        name,
        picture: avatarUrl,
      } = payload;

      if (!email) {
        throw new BadRequestError("Google email not available.");
      }

      const user = await authService.oauthLogin({
        provider: "GOOGLE",
        providerAccountId,
        email,
        name,
        avatarUrl,
      });

      return user;
    } catch (error) {
      throw new UnauthorizedError("Failed to verify Google token");
    }
  },
  createOneTimeCode: async (userId: string): Promise<string> => {
    const code = crypto.randomBytes(32).toString("hex");
    const key = `oauth-code:${code}`;
    await redisClient.set(key, userId, {
      EX: 60,
    });
    return code;
  },
  exchangeCodeForTokens: async (
    code: string,
  ): Promise<{
    user: any;
    tokens: { accessToken: string; refreshToken: string };
  }> => {
    const key = `oauth-code:${code}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      throw new UnauthorizedError("Invalid or expired authorization code.");
    }

    await redisClient.del(key);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError("User not found for this code.");
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    return {
      user,
      tokens: { accessToken, refreshToken },
    };
  },
  forgotPassword: async (email: string) => {
    const account = await prisma.account.findFirst({
      where: {
        provider: "CREDENTIALS",
        user: { email: email },
      },
      include: { user: true },
    });

    if (!account || !account.user) {
      logger.warn(`Password reset requested for non-existent email: ${email}`);
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const redisKey = `reset-token:${resetToken}`;

    await redisClient.set(redisKey, account.userId, {
      EX: 900,
    });

    const resetUrl = `${config.CLIENT_URL}/reset-password?token=${resetToken}`;

    await emailService.sendPasswordResetEmail(
      account.user.email,
      account.user.name,
      resetUrl,
    );
  },
  resetPassword: async (token: string, newPassword_: string) => {
    const redisKey = `reset-token:${token}`;
    const userId = await redisClient.get(redisKey);

    if (!userId) {
      throw new BadRequestError(
        "Invalid or expired password reset token.",
        ERROR_CODE_ENUM.INVALID_TOKEN,
      );
    }

    const hashedNewPassword = await hashPassword(newPassword_);

    await prisma.account.updateMany({
      where: {
        userId: userId,
        provider: "CREDENTIALS",
      },
      data: { password: hashedNewPassword },
    });

    await redisClient.del(redisKey);
  },
};
