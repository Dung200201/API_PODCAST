import { Decimal } from "@prisma/client/runtime/library";
import { z } from "zod";

// Enum validation cho PackageType
const PackageTypeEnum = z.enum(["mini", "small", "huge", "mega"]);

export const createPackagesSchemas = z.object({
  userId: z.string(), // userId: số nguyên dương
  type: PackageTypeEnum, // type: một trong các giá trị của enum
  name: z.string().min(1, "Name is required"), // name: chuỗi, không được rỗng
  description: z.string().optional(), // description: chuỗi, tùy chọn
  points: z.number().int().nonnegative(), // points: số nguyên >= 0
  price_vnd: z.string().regex(/^\d+(\.\d+)?$/, "Invalid price format"), // price_vnd: Chuỗi và chuyển đổi thành Decimal
  price_usd: z.string().regex(/^\d+(\.\d+)?$/, "Invalid price format"), // price_usd: Chuỗi và chuyển đổi thành Decimal
});

export const updatePackagesSchemas = z.object({
  userId: z.string(), // userId: số nguyên dương
  type: PackageTypeEnum, // type: một trong các giá trị của enum
  name: z.string().min(1, "Name is required"), // name: chuỗi, không được rỗng
  description: z.string().optional(), // description: chuỗi, tùy chọn
  points: z.number().int().nonnegative(), // points: số nguyên >= 0
  createdAt: z.date().optional(), // createdAt: ngày, tùy chọn
  updatedAt: z.date().optional(), // updatedAt: ngày, tùy chọn
  price_vnd: z.string().regex(/^\d+(\.\d+)?$/, "Invalid price format").transform(value => new Decimal(value)).optional(), // price_vnd: Chuỗi và chuyển đổi thành Decimal, tùy chọn
  price_usd: z.string().regex(/^\d+(\.\d+)?$/, "Invalid price format").transform(value => new Decimal(value)).optional(), // price_usd: Chuỗi và chuyển đổi thành Decimal, tùy chọn
  deletedAt: z.date().optional(), // price_usd: Chuỗi và chuyển đổi thành Decimal, tùy chọn
})

// Export type for TypeScript support
export type CreatePackagesInput = z.infer<typeof createPackagesSchemas>;
export type UpdatePackagesInput = z.infer<typeof updatePackagesSchemas>;
