import z from "zod";

export const SocialAccountUpdateSchema = z.object({
  note: z.string({ required_error: "Note is required" })
    .trim()
    .max(255, "Note must not exceed 255 characters")
    .optional(),
  cookies: z.string({ required_error: "Cookies is required" })
    .trim()
    .optional(), 
  status: z.enum(["uncheck", "checking", "live", "limit", "error"], {
    required_error: "Status is required",
    invalid_type_error: "Status must be one of: uncheck, checking, live, limit, error",
  }).optional(),
});

export const createAccountSchema = z.object({
  socialGroupId: z.string({ required_error: "Social group is required" })
    .trim()
    .max(155, "Social group ID must not exceed 155 characters"),
  website: z.string({ required_error: "Website is required" })
    .trim()
    .max(155, "Website must not exceed 155 characters")
    .regex(
      /^(?!https?:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/,
      "Domain must be a valid domain without http or https"
    ),
  username: z.string()
    .trim()
    .max(55, "Username must not exceed 55 characters")
    .optional(),
  email: z.string()
    .email("Email must be a valid email")
    .trim()
    .max(155, "Email must not exceed 155 characters")
    .optional(),
  password: z.string()
    .max(255, "Password must not exceed 255 characters")
    .nullable()
    .optional(),
  cookies: z.string().nullable().optional(), 
  push: z
    .number({ required_error: "Push value is required" })
    .int("Push must be an integer")
    .default(0),
  active: z
    .boolean({ required_error: "Active status is required" })
    .default(true),
  status: z.enum(["uncheck", "checking", "live", "limit", "error"], {
    required_error: "Status is required",
    invalid_type_error: "Status must be one of: uncheck, checking, live, limit, error",
  }).default("uncheck"),
  note: z.string()
    .trim()
    .max(255, "Note must not exceed 255 characters")
    .nullable()
    .optional(),
});

export const updateAccountSchema = z.object({
  id: z.string({ required_error: "ID is required" })
    .trim()
    .max(155, "ID must not exceed 155 characters"),
  socialGroupId: z.string()
    .trim()
    .max(155, "Social group ID must not exceed 155 characters")
    .optional(),
  id_tool: z.string()
    .trim()
    .max(55, "Tool ID must not exceed 55 characters")
    .nullable()
    .optional(),
  website: z.string()
    .trim()
    .max(155, "Website must not exceed 155 characters")
    .regex(
      /^(?!https?:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/,
      "Domain must be a valid domain without http or https"
    )
    .optional(),
  username: z.string()
    .trim()
    .max(55, "Username must not exceed 55 characters")
    .nullable()
    .optional(),
  email: z.string()
    .trim()
    .email("Email must be a valid email")
    .max(155, "Email must not exceed 155 characters")
    .nullable()
    .optional(),
  password: z.string()
    .max(255, "Password must not exceed 255 characters")
    .nullable()
    .optional(),
  twoFA: z.string()
    .trim()
    .max(155, "TwoFA must not exceed 155 characters")
    .nullable()
    .optional(),
  cookies: z.string()
    .nullable()
    .optional(),
  active: z.boolean().optional(),
  status: z.enum(["uncheck", "checking", "live", "limit", "error"]).optional(),
  note: z.string()
    .trim()
    .max(255, "Note must not exceed 255 characters")
    .nullable()
    .optional(),
  deletedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});