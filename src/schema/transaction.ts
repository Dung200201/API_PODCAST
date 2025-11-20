import z from "zod";

export const AdminPointTransactionSchema = z.object({
  customerId: z.string().uuid({ message: "Invalid customer ID" }),
  currency: z.string().min(1),
  money_vnd: z.number().positive({ message: "money_vnd must be > 0" }),
  points: z.number().positive({ message: "points must be > 0" }),
  transactionType: z.enum(["credit", "debit", "transfer"]),
  description: z.string().optional(),
});

export const createTransactionSchema = z.object({
  email: z.string().email(),
  depositId: z.string().optional(),
  reference: z.string().optional(),
  type: z.enum(["credit", "debit"]),
  service: z.string().default("reward"),
  description: z.string().optional(),
  points: z.number().int(),
  status: z.boolean().optional().default(true),
});