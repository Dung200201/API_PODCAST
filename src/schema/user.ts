import { z } from "zod";

export const userSchema = z.object({
  // Profile validation
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long" })
    .max(30, { message: "Username cannot exceed 30 characters" })
    .regex(/^[A-Za-z0-9]+$/, {
      message: "Username must only contain letters and numbers",
    })
    .refine((val) => !val.toLowerCase().includes("admin"), {
      message: "Username cannot contain the word 'admin'",
    }).optional(),
    role: z.enum(["user", "admin", "dev", "support"]).default("user").optional(),
    type: z.enum(['normal', 'advanced', 'priority']).default("normal").optional(),
    language: z.enum(["en", "auto"]).default("auto").optional(),
    phone: z
    .string()
    .min(10, { message: "Phone must be at least 10 characters" })
    .max(15, { message: "Phone must be at most 15 characters" })
    .nullable()
    .optional(),
    company: z.string().nullable().optional(),
    status: z.enum(["active", "banned", "pending"]).default("active").optional(),
})

const userStatusEnum = z.enum(["active", "banned", "pending"]);
const deletedAtEnum = z.enum(["only_active", "only_deleted", "all"]);

// 
export const userSearchSchema = z.object({
    _page: z.coerce.number().min(1).default(1),
    _limit: z.coerce.number().int().refine(val => val === -1 || (val >= 1 && val <= 100), {
        message: "_limit must be between 1-100 or -1 for all data"
    }).default(10),
    _status: userStatusEnum.optional(),
    _role: z.string().optional(), // Nếu bạn có enum cho role thì dùng enum
    _type: z.string().optional(), // Nếu có enum cho type thì dùng enum
    _order: z.enum(["asc", "desc"]).default("desc"),
    _deletedAt: deletedAtEnum.default("only_active"),
    _s: z.string().trim().optional(),
    _start_date: z.string().optional(),
    _end_date: z.string().optional(),
});