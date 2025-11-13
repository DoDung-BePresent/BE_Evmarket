/**
 * Node modules
 */
import z from "zod";

export const authValidation = {
  register: z.object({
    body: z.object({
      name: z
        .string()
        .trim()
        .nonempty()
        .min(2, "Minimum 2 characters")
        .max(50, "Maximum 50 characters"),
      email: z
        .string()
        .trim()
        .nonempty("Email is required")
        .email("Please enter a valid email address.")
        .max(50, "Maximum 50 characters"),
      password: z
        .string()
        .trim()
        .nonempty("Password is required")
        .min(8, "Minimum 8 characters")
        .max(50, "Maximum 50 characters"),
    }),
  }),
  login: z.object({
    body: z.object({
      email: z
        .string()
        .trim()
        .nonempty("Email is required")
        .email("Please enter a valid email address.")
        .max(50, "Maximum 50 characters"),
      password: z
        .string()
        .trim()
        .nonempty("Password is required")
        .max(50, "Maximum 50 characters"),
    }),
  }),
  googleMobileLogin: z.object({
    body: z.object({
      idToken: z.string().nonempty("idToken is required"),
    }),
  }),
  exchangeCode: z.object({
    body: z.object({
      code: z.string().nonempty("Authorization code is required"),
    }),
  }),
  forgotPassword: z.object({
    body: z.object({
      email: z.string().email("Please enter a valid email address."),
    }),
  }),
  resetPassword: z.object({
    body: z
      .object({
        token: z.string().nonempty("Token is required."),
        newPassword: z
          .string()
          .min(8, "New password must be at least 8 characters long."),
        confirmPassword: z.string(),
      })
      .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      }),
  }),
};

export type RegisterPayload = z.infer<
  typeof authValidation.register.shape.body
>;
export type LoginPayload = z.infer<typeof authValidation.login.shape.body>;
