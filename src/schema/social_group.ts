import { z } from "zod";

export const createSocialGroupSchema = z.object({
  name: z.string()
  .min(3, { message: "Name must be at least 3 characters long" })
  .max(30, { message: "Name must not exceed 30 characters" })
  .trim()
  .regex(/^[A-Za-z0-9]+$/, {
    message: "Name must only contain letters and numbers",
  }),
  status: z.string().trim().optional(), // converted boolean to string for consistency
});

export const updateSocialGroupSchema = z.object({
  id: z.string().min(1, { message: 'ID is required' }).trim(),
  name: z.string()
  .min(3, { message: "Name must be at least 3 characters long" })
  .max(30, { message: "Name must not exceed 30 characters" })
  .trim()
  .regex(/^[A-Za-z0-9]+$/, {
    message: "Name must only contain letters and numbers",
  }),
  userId: z.string().trim().optional().nullable(),
  id_tool: z.string().trim().optional().nullable(),
  gmail: z.string().trim().email({ message: 'Invalid email format' }).optional().nullable(),
  pass_mail: z.string().trim().optional().nullable(),
  twoFA: z.string().trim().optional().nullable(),
  recovery_mail: z.string().trim().optional().nullable(),
  status: z.string().trim().optional(), // Changed enum to string for consistency
  deletedAt: z.string().trim().optional().nullable(),
  createdAt: z.string().trim().optional(),
  updatedAt: z.string().trim().optional(),
});
