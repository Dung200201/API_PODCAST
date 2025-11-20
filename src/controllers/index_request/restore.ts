import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";

// Định nghĩa kiểu dữ liệu cho request body
interface RestoreIndexesBody {
  ids: string[];
}

// Khôi phục gói từ thùng rác
export const restoreIndexRequest = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: RestoreIndexesBody }>,
  reply: FastifyReply
) => {
  try {
    const { ids } = request.body;
    const {id:userId}  = request.user as { id: string };

    // Kiểm tra nếu danh sách ID rỗng hoặc không hợp lệ
    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({
        message: "Invalid request. Please provide a list of valid IDs.",
        success: false,
      });
    }

    // Kiểm tra xem có bản ghi nào cần khôi phục không
    const existingIndexes = await fastify.prisma.indexRequest.findMany({
      where: {
        id: { in: ids },
        userId: userId,
        deletedAt: { not: null }, // Chỉ lấy các bản ghi đã bị xóa
      },
      select: { id: true },
    });

    if (existingIndexes.length === 0) {
      return reply.status(404).send({
        message: "No valid indexes found in the trash.",
        success: false,
      });
    }

    // Thực hiện khôi phục dữ liệu
    const restoredIndexes = await fastify.prisma.indexRequest.updateMany({
      where: {
        id: { in: existingIndexes.map((index) => index.id) }, // Chỉ update những ID hợp lệ
      },
      data: { deletedAt: null },
    });

    return reply.status(200).send({
      message: `Restored ${restoredIndexes.count} indexes successfully!`,
      success: true,
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};
