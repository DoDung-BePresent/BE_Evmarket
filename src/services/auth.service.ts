/**
 * Node modules
 */
import axios from "axios";

/**
 * Libs
 */
import prisma from "@/libs/prisma";
import { supabase } from "@/libs/supabase";
import { compressImage } from "@/libs/compress";
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

        const fileName = `avatars/${Date.now()}-${provider}-${providerAccountId}.jpg`;
        const { error } = await supabase.storage
          .from("avatars")
          .upload(fileName, compressedBuffer, { contentType: "image/jpeg" });

        if (!error) {
          const { data } = supabase.storage
            .from("avatars")
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

      const fileName = `avatars/${Date.now()}-${provider}-${providerAccountId}.jpg`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(fileName, compressedBuffer, { contentType: "image/jpeg" });

      if (!error) {
        const { data } = supabase.storage
          .from("avatars")
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
};
