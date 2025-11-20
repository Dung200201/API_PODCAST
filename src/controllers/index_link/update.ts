import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
import z from "zod";
dotenv.config();
interface BatchUpdateItem {
  id: string;
  data: {
    url?: string;
    response?: number;
    push?: number;
    information?: string;
    indexed?: boolean;
    deletedAt?: Date;
    status?: "new" | "pending" | "indexing" | "done" | "failed";
    indexRequestId?: string;
  };
}

const batchUpdateSchema = z.array(z.object({
  id: z.string().uuid(),
  data: z.object({
    url: z.string().url().optional(),
    indexRequestId: z.string().uuid().optional(),
    response: z.number().min(0).optional(),
    push: z.number().min(0).optional(),
    information: z.string().max(5000).optional(),
    indexed: z.boolean().optional(),
    deletedAt: z.preprocess((val) => (val ? new Date(val as string) : undefined), z.date().optional()),
    status: z.enum(["new", "pending", "indexing", "done", "failed"]).optional(),
  }).refine((d) => Object.keys(d).length > 0, { message: "At least one field must be provided for update." })
}));

export const batchUpdateIndexLinks = async (
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

      const existing = await fastify.prisma.indexLink.findUnique({
        where: { id },
        select: { id: true }
      });

      if (!existing) {
        return { id, success: false, message: "IndexLink not found" };
      }

      await fastify.prisma.indexLink.update({
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
