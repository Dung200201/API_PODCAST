import { z } from "zod";

export const entityLinkSchema = z.object({
    entityRequestId: z
        .string({ required_error: "entityRequestId is required" })
        .min(1, { message: "entityRequestId cannot be empty" }).optional(),

    id_tool: z
        .string({ required_error: "Tool ID is required" })
        .min(1, { message: "Tool ID cannot be empty" })
        .optional(),

    email: z
        .string({ required_error: "Email is required" })
        .email({ message: "Invalid email format" })
        .optional(),

    username: z
        .string({ required_error: "Username is required" })
        .min(1, { message: "Username cannot be empty" })
        .optional(),

    password: z
        .string({ required_error: "Password is required" })
        .min(1, { message: "Password cannot be empty" })
        .optional(),

    about: z
        .string()
        .max(5000, { message: "About section must be less than 5000 characters" })
        .optional(),

    site: z
        .string({ invalid_type_error: "Site must be a string" })
        .optional(),

    link_profile: z
        .string({ required_error: "Profile link is required" })
        .optional()
        .refine(
            (val) => !val || val.trim() === "" || z.string().url().safeParse(val).success,
            {
                message: "Profile link must be a valid URL",
            }
        ),

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
