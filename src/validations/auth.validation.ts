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
};

export type RegisterPayload = z.infer<
  typeof authValidation.register.shape.body
>;
export type LoginPayload = z.infer<typeof authValidation.login.shape.body>;
