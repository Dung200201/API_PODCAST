import z from "zod";

const gmailItemSchema = z.object({
    email: z.string({ required_error: "Email is required" }).trim(),
    password: z.string()
               .max(155, "Password must be at most 155 characters")
               .trim()
               .optional(),
    app_password: z.string()
                   .max(255, "App password must be at most 255 characters")
                   .trim()
                   .optional(),
    secret_key: z.string()
                 .max(255, "Secret key must be at most 255 characters")
                 .trim()
                 .optional(),
    recovery_email: z.string()
                     .max(191, "Recovery email must be at most 191 characters")
                     .trim()
                     .optional(),
    owner: z.number({
      required_error: "Owner is required",
      invalid_type_error: "Owner must be a number"
    }).int("Owner must be an integer")
      .nonnegative("Owner must be a non-negative number"),
    status: z.enum(['success', 'failed'], {
      required_error: "Status is required",
      invalid_type_error: "Status must be either 'success' or 'failed'"
    }),
});
  
export const createGmailSchema = z.object({
data: z.array(gmailItemSchema, { required_error: "Data array is required" })
});