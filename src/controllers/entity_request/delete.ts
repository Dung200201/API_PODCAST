import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { EntityRequestStatus } from "@prisma/client";

// Định nghĩa kiểu dữ liệu cho request body
interface DeleteIndexesBody {
  ids: string[];
}

// Xoá xĩnh viễn
export const deletEntityRequestById = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: DeleteIndexesBody }>,
  reply: FastifyReply
) => {
  try {
    const { ids } = request.body;
    const { id: userId, role } = request.user as { id: string, role: string };
    const isAdmin = role === "admin";

    // Kiểm tra nếu danh sách ID rỗng hoặc không hợp lệ
    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({
        message: "Invalid request. Please provide a list of valid IDs.",
        success: false,
      });
    }

    // Kiểm tra xem có bản ghi nào cần xóa không
    const existingData = await fastify.prisma.entityRequest.findMany({
      where: isAdmin ? {
        id: { in: ids },
      } : {
        id: { in: ids },
        userId: userId,
      },
      select: { id: true },
    });

    if (existingData.length === 0) {
      return reply.status(404).send({
        message: "No valid entities found for deletion.",
        success: false,
      });
    }

    // Chia nhỏ danh sách ID để tránh quá tải DB nếu có quá nhiều bản ghi
    const BATCH_SIZE = 100; // Tùy chỉnh batch size phù hợp với DB của bạn
    const idBatches = [];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      idBatches.push(ids.slice(i, i + BATCH_SIZE));
    }

    let totalDeleted = 0;

    // Xóa từng batch
    for (const batch of idBatches) {
      const deleted = await fastify.prisma.entityRequest.deleteMany({
        where: { id: { in: batch }, deletedAt: { not: null } }, // Chỉ xóa những bản ghi đã bị xóa mềm trước đó
      });
      totalDeleted += deleted.count;
    }

    if (totalDeleted === 0) {
      return reply.status(404).send({
        message: "Entity not found or already deleted.",
        success: false,
      });
    }

    return reply.status(200).send({
      message: `Deleted ${totalDeleted} entities successfully!`,
      success: true,
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};

const BATCH_SIZE = 10;
const MAX_IDS = 100;
const CONCURRENCY_LIMIT = 5;

// Soft delete handler
export const softDeletEntity = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: { ids: string[] } }>,
  reply: FastifyReply
) => {
  try {
    const { ids } = request.body;
    const { id: userId, role } = request.user as { id: string; role: string };
    const isAdmin = (role === "admin") ||
      (role === "dev");

    // Validate request
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

    // Create batches
    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      batches.push(ids.slice(i, i + BATCH_SIZE));
    }

    // Concurrency control
    const queue: Promise<any>[] = [];
    let totalUpdated = 0;

    const runWithLimit = async (batch: string[]) => {
      const whereClause = isAdmin
        ? {
          id: { in: batch },
          deletedAt: null,
          status: { in: [EntityRequestStatus.draft, EntityRequestStatus.completed, EntityRequestStatus.cancel] }
        }
        : {
          id: { in: batch },
          userId,
          deletedAt: null,
          status: { in: [EntityRequestStatus.draft, EntityRequestStatus.completed, EntityRequestStatus.cancel] }
        };

      return await fastify.prisma.entityRequest.updateMany({
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

      // Chờ nếu đã đạt giới hạn concurrent
      if (queue.length >= CONCURRENCY_LIMIT) {
        await Promise.race(queue);
        // Gỡ promise đã hoàn thành ra khỏi hàng đợi
        for (let i = 0; i < queue.length; i++) {
          if ((await Promise.resolve(queue[i])).status !== "pending") {
            queue.splice(i, 1);
            break;
          }
        }
      }
    }

    await Promise.allSettled(queue);

    // Không tìm thấy hoặc đã xoá rồi
    if (totalUpdated === 0) {
      return reply.status(404).send({
        message: "Data not found or already deleted.",
        success: false,
      });
    }

    // Gửi phản hồi
    const message =
      ids.length === 1
        ? `Deleted data ${ids[0]} successfully!`
        : `Deleted ${totalUpdated} data successfully!`;

    return reply.status(200).send({
      message,
      success: true,
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};
