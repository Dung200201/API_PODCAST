import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { handleErrorResponse } from "../../utils/handleError";
export interface BatchUpdateItem {
  id: string;
  data: {
    indexed?: boolean;
    link_profile?: string;
    link_post?: string | null;
    note?: string;
    deletedAt?: Date | string;
    domains?: "likepion" | "linkbox" | "all";

    // Optional: for internal/stat tracking only
    entityRequestId ?: string;

    email?: string;
    username?: string;
    password?: string;
    about?: string;
    site?: string;
  };
}

const idSchema = z.string().min(1).max(191);

export const batchUpdateSchema = z.array(
  z.object({
    id: idSchema,
    data: z.object({
      // Trường phụ trợ sẽ được map sang field thật
      index: z.boolean().optional(),            // map -> index: 0/1

      // Trường thật trong DB
      link_profile: z.string().url().optional(),
      link_post: z.string().url().optional().nullable(),
      note: z.string().max(255).optional(),
      status: z.string().max(255).optional(),
      deletedAt: z.preprocess(
        (val) => (val ? new Date(val as string) : undefined),
        z.date().optional()
      ),
      domains: z.enum(["likepion", "linkbox", "all"]).optional(),

      // Bổ sung các field phụ có thể sử dụng cho thống kê nội bộ (không lưu DB)
      push: z.number().min(0).optional(),
      entityRequestId : z.string().optional(),

      // Bạn cũng có thể cho phép update các field này nếu có nhu cầu:
      email: z.string().email().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      about: z.string().optional(),
      site: z.string().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, {
      message: "At least one field must be provided for update."
    })
  })
);

export const batchUpdateEntityLinkLinks = async (
    fastify: FastifyInstance,
    request: FastifyRequest<{ Body: BatchUpdateItem[] }>,
    reply: FastifyReply
) => {
    try {
        const parseResult = batchUpdateSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({
                message: "Invalid input data",
                errors: parseResult.error.errors,
                success: false,
            });
        }

        const updates = parseResult.data;

        const updatePromises = updates.map(async (item) => {
            const { id, data } = item;

            const existing = await fastify.prisma.entityLink.findUnique({
                where: { id },
                select: { id: true }
            });

            if (!existing) {
                return { id, success: false, message: "IndexLink not found" };
            }

            await fastify.prisma.entityLink.update({
                where: { id },
                data
            });

            return { id, success: true };
        });

        const results = await Promise.all(updatePromises);

        return reply.status(200).send({
            success: true,
            results
        });
    } catch (error) {
        console.error("error", error);
        handleErrorResponse(reply, error);
    }
};
