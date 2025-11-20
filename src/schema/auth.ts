import { z } from "zod";

export const signupSchema = z.object({
  username: z
    .string()
    .min(6, { message: "Username must be at least 3 characters long" })
    .max(30, { message: "Username cannot exceed 30 characters" })
    .regex(/^[a-z][a-z0-9]*$/, {
      message:
        "Username must start with a lowercase letter and only contain lowercase letters and numbers",
    })
    .refine((val) => !val.toLowerCase().includes("admin"), {
      message: "Username cannot contain the word 'admin'",
  }),
  email: z.string().email({ message: "Invalid email format." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long." })
    .max(50, { message: "Password cannot exceed 50 characters." }),
  isVN: z.boolean().default(true),
});

export const signinSchema = z.object({
  email: z.string().email({ message: "Invalid email format." }),
  password: z
  .string()
  .min(8, { message: "Password must be at least 8 characters long." })
  .max(50, { message: "Password cannot exceed 50 characters." })
});

// Define schema for validation
export const resetPasswordSchema = z.object({
  token: z.string().nonempty({ message: "Token is required" }),
  newPassword: z
  .string()
  .min(8, { message: "New Password must be at least 8 characters long." })
  .max(50, { message: "New Password cannot exceed 50 characters." })
});

export const changePasswordSchema = z.object({
  token: z.string().nonempty({ message: "Token is required" }),
  oldPassword: z
  .string()
  .min(8, { message: "Old Password must be at least 8 characters long." })
  .max(50, { message: "Old Password cannot exceed 50 characters." }),
  newPassword: z
    .string()
    .min(8, { message: "New Password must be at least 8 characters long." })
    .max(50, { message: "New Password cannot exceed 50 characters." })
});

// Export type for TypeScript support
export type SignupInput = z.infer<typeof signupSchema>;
export type SigninInput = z.infer<typeof signinSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
