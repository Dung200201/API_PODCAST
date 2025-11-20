import { z } from "zod";

const SpinContentEnum = z.enum(["always", "once"]);
const StatusEnum = z.enum(["draft", "new", "pending", "running", "completed"]);

export const googleStackingRequestSchema = z.object({
  id_tool: z.string({
    required_error: "Tool ID is required",
  }).trim().max(55, "Tool ID must not exceed 55 characters").optional(),

  auction_price: z.number({
    required_error: "Auction price is required",
  })
    .int("Bidding must be an integer")
    .min(30, "Bidding price is 30")
    .max(100, "Bidding price is 100"),

  duplicate: z.number()
    .int("Duplicate must be an integer")
    .max(100, "Duplicate is 100").default(0),

  title: z.string({
    required_error: "Title is required",
  }).trim().max(255, "Title must not exceed 255 characters"),

  website: z.string({
    required_error: "Website is required",
  }).trim().url("Invalid URL").max(255, "Website must not exceed 255 characters"),

  about: z
    .string({ required_error: "About section is required" })
    .trim()
    .min(30, { message: "About section must be at least 30 characters long" })
    .max(9000, { message: "About section must not exceed 9000 characters" })
    .refine((val) => !/<script|onerror|onload/i.test(val), {
      message: "About section contains unsafe content",
    }),

  address: z.string({
    required_error: "Address is required",
  }).trim().max(200, "Address must not exceed 200 characters"),

  location: z.string({
    required_error: "Location is required",
  }).trim().max(100, "Location must not exceed 100 characters"),

  phone: z.string({
    required_error: "Phone number is required",
  }).trim().max(20, "Phone must not exceed 20 characters"),

  folder_url: z.string().trim().max(155, "Folder URL too long").optional().nullable(),

  stacking_connect: z.string().trim().max(1000, "Stacking connect too long").optional(),

  spin_content: SpinContentEnum.default("always"),
  status: StatusEnum.default("draft"),

  deletedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date().optional().default(() => new Date()),
  updatedAt: z.coerce.date().optional().default(() => new Date()),
});