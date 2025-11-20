import z from "zod";

// IndexQuerySchema
const StatusEnum = z.enum(["new", "pending", "running", "completed"]);
const OrderEnum = z.enum(["asc", "desc"]);
const DeletedAtEnum = z.enum(["all", "only_deleted", "only_active"]);
const MIN_LIMIT = -1;
const MIN_PAGE = 1;
const MAX_LIMIT = 500;

// IndexQuerySchema
export const IndexQuerySchema = z.object({
  _s: z.string().optional(),

  _page: z.coerce.number({
    invalid_type_error: "Page must be a number",
  }).min(MIN_PAGE, { message: `Page must be at least ${MIN_PAGE}` }).default(1),

  _limit: z.coerce.number({
    invalid_type_error: "Limit must be a number",
  })
  .min(MIN_LIMIT, { message: `Limit must be at least ${MIN_LIMIT}` })
  .max(MAX_LIMIT, { message: `Limit must not exceed ${MAX_LIMIT}` })
  .default(10),

  _role: z.string().optional(),

  _status: z.union([StatusEnum, z.array(StatusEnum)])
  .optional()
  .refine((val: any) => val !== "", {
    message: `Status must be one of: ${StatusEnum.options.join(", ")}`,
  }),

  _start_date: z.string({
    invalid_type_error: "Start date must be a string",
  }).optional(),

  _end_date: z.string({
    invalid_type_error: "End date must be a string",
  }).optional(),

  _order: OrderEnum.default("desc"),

  _deletedAt: DeletedAtEnum.default("only_active"),
});
