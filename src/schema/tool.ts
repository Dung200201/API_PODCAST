import z from "zod";

export const createToolSchema = z.object({
    id_tool: z.string().min(1, "id_tool is required"),
    thread_number: z.number().int().min(1, "thread_number must be a positive integer"),
    type: z.enum(["individual", "global"]),
    status: z.enum(["die", "running"]),
    service: z.enum(["entity", "social", "index"]),
});