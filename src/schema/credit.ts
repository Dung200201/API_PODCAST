import { z } from "zod";

export const createCreditSchemas = z.object({
  userId:   z.string(), // userId: số nguyên dương
  name: z.string().min(1, "Name is required"), // name: chuỗi, không được rỗng
  description: z.string().optional(), // description: chuỗi, tùy chọn
});

export const updateCreditSchemas = z.object({
  userId:   z.string(), // userId: số nguyên dương
  name: z.string().min(1, "Name is required"), // name: chuỗi, không được rỗng
  description: z.string().optional(), // description: chuỗi, tùy chọn
  createdAt: z.date().optional(), // createdAt: ngày, tùy chọn
  updatedAt: z.date().optional(), // updatedAt: ngày, tùy chọn
});
