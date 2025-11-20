import { z } from "zod";

export const googleStackingLinkSchema = z.object({
    ggStackingRequestId: z
        .string({ required_error: "ggStackingRequestId is required" })
        .min(1, { message: "ggStackingRequestId cannot be empty" }).optional(),

    id_tool: z
        .string({ required_error: "Tool ID is required" })
        .min(1, { message: "Tool ID cannot be empty" })
        .optional(),
    about: z
        .string()
        .max(5000, { message: "About section must be less than 5000 characters" })
        .optional(),

    site: z
        .string({ invalid_type_error: "Site must be a string" })
        .optional(),
    link_post: z
        .string()
        .optional()
        .nullable()
        .refine(
            (val) => val === null || val === "" || z.string().url().safeParse(val).success,
            {
                message: "Post link must be a valid URL",
            }
        ),
    status: z
        .string({ invalid_type_error: "Status must be a string" })
        .optional(),

    note: z
        .string({ invalid_type_error: "Note must be a string" })
        .optional(),
});
