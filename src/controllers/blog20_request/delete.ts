import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { BlogStatus } from "@prisma/client";

interface DeleteBlogBody {
  ids: string[];
}

const BATCH_SIZE = 10;
const MAX_IDS = 100;
const CONCURRENCY_LIMIT = 5;

export const softDeleteBlog20Request = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: { ids: string[] } }>,
  reply: FastifyReply
) => {
  try {
    const { ids } = request.body;
    const { id: userId, role } = request.user as { id: string; role: string };
    const isAdmin = role === "admin" || role === "dev";

    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({
        message: "Invalid request. Please provide a list of IDs.",
        success: false,
      });
    }

    if (ids.length > MAX_IDS) {
      return reply.status(400).send({
        message: `Too many IDs. Please send up to ${MAX_IDS} at a time.`,
        success: false,
      });
    }

    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      batches.push(ids.slice(i, i + BATCH_SIZE));
    }

    const queue: Promise<any>[] = [];
    let totalUpdated = 0;

    const runWithLimit = async (batch: string[]) => {
      const whereClause = isAdmin
        ? {
            id: { in: batch },
            deletedAt: null,
            status: { in: [BlogStatus.draft, BlogStatus.completed, BlogStatus.cancel] },
          }
        : {
            id: { in: batch },
            userId,
            deletedAt: null,
            status: { in: [BlogStatus.draft, BlogStatus.completed, BlogStatus.cancel] },
          };

      return await fastify.prisma.blog20Request.updateMany({
        where: whereClause,
        data: { deletedAt: new Date() },
      });
    };

    for (const batch of batches) {
      const promise = runWithLimit(batch).then(result => {
        totalUpdated += result.count;
        return result;
      });

      queue.push(promise);

      if (queue.length >= CONCURRENCY_LIMIT) {
        await Promise.race(queue);
        queue.splice(0, 1);
      }
    }

    await Promise.allSettled(queue);

    if (totalUpdated === 0) {
      return reply.status(404).send({
        message: "Data not found or already deleted.",
        success: false,
      });
    }

    return reply.status(200).send({
      message: `Deleted ${totalUpdated} blog20 requests successfully!`,
      success: true,
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};

export const deleteBlog20RequestById = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: DeleteBlogBody }>,
  reply: FastifyReply
) => {
  try {
    const { ids } = request.body;
    const { id: userId, role } = request.user as { id: string; role: string };
    const isAdmin = role === "admin";

    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({
        message: "Invalid request. Please provide a list of IDs.",
        success: false,
      });
    }

    const existingData = await fastify.prisma.blog20Request.findMany({
      where: isAdmin
        ? { id: { in: ids } }
        : { id: { in: ids }, userId },
      select: { id: true },
    });

    if (existingData.length === 0) {
      return reply.status(404).send({
        message: "No valid entities found for deletion.",
        success: false,
      });
    }

    const BATCH_SIZE = 100;
    const idBatches = [];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      idBatches.push(ids.slice(i, i + BATCH_SIZE));
    }

    let totalDeleted = 0;

    for (const batch of idBatches) {
      const deleted = await fastify.prisma.blog20Request.deleteMany({
        where: { id: { in: batch }, deletedAt: { not: null } },
      });

      totalDeleted += deleted.count;
    }

    if (totalDeleted === 0) {
      return reply.status(404).send({
        message: "Data not found or not soft-deleted before.",
        success: false,
      });
    }

    return reply.status(200).send({
      message: `Permanently deleted ${totalDeleted} blog20 requests.`,
      success: true,
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};