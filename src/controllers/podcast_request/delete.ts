import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { PodcastStatus } from "@prisma/client";

const BATCH_SIZE = 10;
const MAX_IDS = 100;
const CONCURRENCY_LIMIT = 5;


interface DeletePodcastBody {
  ids: string[];
}

export const softDeletePodcastRequest = async (
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

    // === Tách batch
    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      batches.push(ids.slice(i, i + BATCH_SIZE));
    }

    let totalUpdated = 0;
    const queue: Promise<any>[] = [];

    const updateBatch = async (batch: string[]) => {
      const whereClause = isAdmin
        ? {
            id: { in: batch },
            deletedAt: null,
            status: { in: [PodcastStatus.draft, PodcastStatus.completed, PodcastStatus.cancel] },
          }
        : {
            id: { in: batch },
            userId,
            deletedAt: null,
            status: { in: [PodcastStatus.draft, PodcastStatus.completed, PodcastStatus.cancel] },
          };

      return await fastify.prisma.podcastRequest.updateMany({
        where: whereClause,
        data: { deletedAt: new Date() },
      });
    };

    for (const batch of batches) {
      const promise = updateBatch(batch).then((result) => {
        totalUpdated += result.count;
        return result;
      });

      // Push vào queue
      queue.push(promise);

      // Tự động xóa khỏi queue khi xong
      promise.finally(() => {
        const index = queue.indexOf(promise);
        if (index !== -1) queue.splice(index, 1);
      });

      // Giới hạn số batch chạy song song
      if (queue.length >= CONCURRENCY_LIMIT) {
        await Promise.race(queue);
      }
    }

    // Đợi tất cả hoàn thành
    await Promise.allSettled(queue);

    if (totalUpdated === 0) {
      return reply.status(404).send({
        message: "Data not found or already deleted.",
        success: false,
      });
    }

    return reply.status(200).send({
      message: `Soft-deleted ${totalUpdated} podcast requests successfully!`,
      success: true,
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};

export const deletePodcastRequestById = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: DeletePodcastBody }>,
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

    // Kiểm tra record tồn tại + quyền sở hữu
    const existingData = await fastify.prisma.podcastRequest.findMany({
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
    const idBatches: string[][] = [];

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      idBatches.push(ids.slice(i, i + BATCH_SIZE));
    }

    let totalDeleted = 0;

    for (const batch of idBatches) {
      const deleted = await fastify.prisma.podcastRequest.deleteMany({
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
      message: `Permanently deleted ${totalDeleted} podcast requests.`,
      success: true,
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};