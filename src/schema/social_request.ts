import { z } from "zod";

export const socialRequestSchema = z.object({
  id: z.string({ required_error: "ID is required." })
    .max(155, { message: "ID must not exceed 155 characters." })
    .optional(),
  auction_price: z.number({
    required_error: "Auction price is required.",
    invalid_type_error: "Auction price must be a number.",
  }).min(20, { message: "Auction price must be at least 20." })
    .max(100, { message: "Auction price must not exceed 100." }),
  name: z.string({ required_error: "Name is required." })
    .trim()
    .max(155, { message: "Name must not exceed 155 characters." }),

  userId: z.string({ required_error: "User ID is required." })
    .trim()
    .max(155, { message: "User ID must not exceed 155 characters." }),

  socialGroupId: z.string({ required_error: "Social Group ID is required." })
    .trim()
    .max(155, { message: "Social Group ID must not exceed 155 characters." }),

  percentage: z.number({
    required_error: "Percentage is required.",
    invalid_type_error: "Percentage must be a number.",
  }).min(0, { message: "Percentage must be at least 0." })
    .max(100, { message: "Percentage must not exceed 100." }),

  share_code: z.boolean({
    required_error: "Share code is required.",
    invalid_type_error: "Share code must be a boolean.",
  }),

  email_report: z.boolean({
    required_error: "Email report is required.",
    invalid_type_error: "Email report must be a boolean.",
  }),

  unique_url: z.boolean({
    required_error: "Unique URL is required.",
    invalid_type_error: "Unique URL must be a boolean.",
  }),

  id_tool: z.string({ required_error: "Tool ID is required." })
    .max(155, { message: "Tool ID must not exceed 155 characters." })
    .optional(),

  url_list: z.array(
    z.object({
      website: z.string({
        required_error: "Each Website must have a 'Website' field.",
      }).url("Website must be a valid URL")
        .nonempty({ message: "Website cannot be empty." }),

      language: z.string({
        required_error: "Each URL must have a 'language' field.",
      }).trim()
        .nonempty({ message: "Language cannot be empty." }).optional(),

      keyword: z.string({
        required_error: "Each URL must have a 'keyword' field.",
      }).trim()
        .nonempty({ message: "Keyword cannot be empty." }).optional(),

      image_link: z.string({
        required_error: "Each URL must have an 'image_link' field.",
      }),
      title: z.string({ required_error: "Title is required." })
        .trim()
        .max(120, { message: "Title must not exceed 120 characters." })
        .nonempty({ message: "Title cannot be empty." }).optional(),
      type: z.enum(["AI", "manual"], {
        required_error: "Type is required.",
        invalid_type_error: "Type must be 'multiple' or 'once'.",
      }).default("AI"),

      content: z.string({ required_error: "Content is required." })
        .trim()
        .max(1200, { message: "Content must not exceed 1200 characters." })
        .nonempty({ message: "Content cannot be empty." }).optional(),
    })
  ).nonempty({ message: "'url_list' must contain at least one item." }),

  socialAccountIds: z.array(z.string().trim().min(1, "Each socialAccountId must be a non-empty string"))
    .nonempty({ message: "At least one socialAccountId is required." }),
  status: z.enum(['new', 'pending', 'running', 'completed', 'cancel'], {
    required_error: "Status is required.",
    invalid_type_error: "Invalid status value.",
  }).optional().default("new"),

  deletedAt: z.coerce.date({ invalid_type_error: "DeletedAt must be a valid date." })
    .nullable()
    .optional(),

  createdAt: z.coerce.date({ invalid_type_error: "CreatedAt must be a valid date." })
    .optional(),

  updatedAt: z.coerce.date({ invalid_type_error: "UpdatedAt must be a valid date." })
    .optional(),
});
