import { z } from "zod";

const CouponTypeEnum = z.enum(["increase", "discount", "reward"], {
  errorMap: () => ({ message: "couponType phải là 'increase', 'discount' hoặc 'reward'" }),
});

export const createCouponSchemas = z.object({
  userId: z.string({
    required_error: "userId là bắt buộc",
    invalid_type_error: "userId phải là chuỗi",
  }),
  couponType: CouponTypeEnum,
  description: z.string().optional(),
  couponValue: z.number({
    required_error: "couponValue là bắt buộc",
    invalid_type_error: "couponValue phải là số",
  }).int("couponValue phải là số nguyên")
    .nonnegative("couponValue phải lớn hơn hoặc bằng 0"),
  maxRedemptions: z.number({
    required_error: "maxRedemptions là bắt buộc",
    invalid_type_error: "maxRedemptions phải là số",
  }).int("maxRedemptions phải là số nguyên")
    .nonnegative("maxRedemptions phải lớn hơn hoặc bằng 0"),
  redeemedCount: z.number({
    required_error: "redeemedCount là bắt buộc",
    invalid_type_error: "redeemedCount phải là số",
  }).int("redeemedCount phải là số nguyên")
    .nonnegative("redeemedCount phải lớn hơn hoặc bằng 0"),
  expiresAt: z.coerce.date().optional(),
});

export const updateCouponSchemas = z.object({
  userId: z.string({
    required_error: "userId là bắt buộc",
    invalid_type_error: "userId phải là chuỗi",
  }),
  couponType: CouponTypeEnum,
  description: z.string().optional(),
  couponValue: z.number({
    required_error: "couponValue là bắt buộc",
    invalid_type_error: "couponValue phải là số",
  }).int("couponValue phải là số nguyên")
    .nonnegative("couponValue phải lớn hơn hoặc bằng 0"),
  maxRedemptions: z.number({
    required_error: "maxRedemptions là bắt buộc",
    invalid_type_error: "maxRedemptions phải là số",
  }).int("maxRedemptions phải là số nguyên")
    .nonnegative("maxRedemptions phải lớn hơn hoặc bằng 0"),
  redeemedCount: z.number({
    required_error: "redeemedCount là bắt buộc",
    invalid_type_error: "redeemedCount phải là số",
  }).int("redeemedCount phải là số nguyên")
    .nonnegative("redeemedCount phải lớn hơn hoặc bằng 0"),
  createdAt: z.date().optional(),
  isActive: z.boolean().optional(),
  updatedAt: z.date().optional(),
  expiresAt: z.coerce.date().optional(),
});

// Export type for TypeScript support
export type CreateCouponInput = z.infer<typeof createCouponSchemas>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchemas>;
