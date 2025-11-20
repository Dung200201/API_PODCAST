// schema/entity_request.ts
import z from "zod";

// Regex cho định dạng app_password: chuỗi từ cách nhau bởi dấu cách
const passwordFormatRegex = /^[a-zA-Z0-9]+(?: [a-zA-Z0-9]+)*$/;
// Regex chỉ cho phép chữ, số và dấu gạch dưới trong username
const usernameRegex = /^[a-zA-Z0-9_]+$/;

// ========== SCHEMA CHO TẠO MỚI (ADD) – CÁC TRƯỜNG BẮT BUỘC ==========
export const entityRequestCreateSchema = z.object({
  app_password: z.string({ required_error: "Password is required" })
    .trim()
    .regex(passwordFormatRegex, { message: "Password format is invalid" })
    .max(100, { message: "Password must not exceed 100 characters" }),
  id_tool: z.string()
    .trim()
    .max(100, { message: "Tool ID must not exceed 100 characters" })
    .default(""),

  auction_price: z.number({ required_error: "Bidding is required" })
    .int({ message: "Bidding must be an integer" })
    .min(30, { message: "Bidding must be at least 30" })
    .max(100, { message: "Bidding must not exceed 100" }),

  entity_limit: z.number({ required_error: "Entity limit is required" })
    .int({ message: "Entity limit must be an integer" })
    .min(30, { message: "Limit 30 link" })
    .max(600, { message: "Entity limit must not exceed 600" }),

  username: z.string({ required_error: "Username is required" })
    .trim()
    .min(4, { message: "Username must be at least 4 characters long" })
    .regex(usernameRegex, { message: "Username can only contain letters, numbers, and underscores" })
    .max(100, { message: "Username must not exceed 100 characters" })
    .transform((val) => val.toLowerCase()),

  website: z.string({ required_error: "Website is required" })
    .trim()
    .url({ message: "Invalid website URL" })
    .max(300, { message: "Website URL must not exceed 300 characters" }),

  fixed_sites: z.string()
    .max(7000, { message: "Fixed sites string must not exceed 7000 characters" })
    .default("")
    .refine((value) => !/^https?:\/\//.test(value), {
      message: "Fixed Website must not start with 'http://' or 'https://'",
    }),

  account_type: z.enum(["multiple", "once"]).default("multiple"),

  spin_content: z.enum(["always", "once"], { required_error: "Spin content type is required" })
    .default("always"),

  entity_connect: z.string({ required_error: "Entity connect is required" })
    .trim()
    .max(3000, { message: "Entity connect must not exceed 3000 characters" })
    .refine((val) => !val.includes("<script>"), { message: "Invalid content detected" }),

  social_connect: z.string().trim().max(1000, { message: "Social connect must not exceed 1000 characters" }).optional(),

  first_name: z.string({ required_error: "First name is required" })
    .trim()
    .min(1, { message: "First name cannot be empty" })
    .max(16, { message: "First name must not exceed 16 characters" }),

  last_name: z.string({ required_error: "Last name is required" })
    .trim()
    .min(1, { message: "Last name cannot be empty" })
    .max(16, { message: "Last name must not exceed 16 characters" }),

  about: z.string({ required_error: "About section is required" })
    .trim()
    .min(30, { message: "About section must be at least 30 characters long" })
    .max(9000, { message: "About section must not exceed 9000 characters" })
    .refine((val) => !/<script|onerror|onload/i.test(val), {
      message: "About section contains unsafe content",
    }),

  address: z.string({ required_error: "Address is required" })
    .trim()
    .max(200, { message: "Address must not exceed 200 characters" }),

  phone: z.string().trim().max(20, { message: "Phone number must not exceed 20 characters" }).optional(),

  location: z.string({ required_error: "Location is required" })
    .trim()
    .max(100, { message: "Location must not exceed 100 characters" }),

  avatar: z.string({ required_error: "Avatar is required" })
    .trim()
    .max(300, { message: "Avatar URL must not exceed 300 characters" }),

  cover: z.string({ required_error: "Cover is required" })
    .trim()
    .max(300, { message: "Cover URL must not exceed 300 characters" }),

  password: z.string().trim().max(100, { message: "Password must not exceed 100 characters" }).optional(),
  twofa: z.string().trim().max(100, { message: "2FA code must not exceed 100 characters" }).optional(),
  is_delete: z.boolean().default(false),
});

// ========== SCHEMA CHO CẬP NHẬT (UPDATE) – CHỈ CHECK FIELD ĐƯỢC GỬI LÊN ==========
export const entityRequestUpdateSchema = entityRequestCreateSchema
  .partial()   // tất cả field thành optional – chỉ validate những field có trong payload
  .passthrough();   // không cho key lạ ngoài schema (nếu muốn cho phép, đổi sang .passthrough())
