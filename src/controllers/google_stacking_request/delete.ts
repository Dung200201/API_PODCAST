import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";

// Định nghĩa kiểu dữ liệu cho request body
interface DeleteIndexesBody {
  ids: string[];
}

// Xoá xĩnh viễn
export const deleteGgStackingRequestById = async (
  fastify: FastifyInstance,
  request:  FastifyRequest<{ Body: DeleteIndexesBody }>,
  reply: FastifyReply
) => {
  try {
    const { ids } = request.body;
    const {id:userId, role} = request.user as { id: string, role: string } ;
     const isAdmin =
      (role === "admin") ||
      (role === "dev");

    // Kiểm tra nếu danh sách ID rỗng hoặc không hợp lệ
    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({ 
        message: "Invalid request. Please provide a list of valid IDs.",
        success: false,
      });
    }
   
    // Kiểm tra xem có bản ghi nào cần xóa không
    const existingData = await fastify.prisma.googleStackingRequest.findMany({
      where: isAdmin ? {
        id: { in: ids },
      } :  {
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
      const deleted = await fastify.prisma.googleStackingRequest.deleteMany({
        where: { id: { in: batch }, deletedAt: { not: null } }, // Chỉ xóa những bản ghi đã bị xóa mềm trước đó
      });
      totalDeleted += deleted.count;
    }

    if(totalDeleted === 0){
      return reply.status(404).send({
        message: "Google Stacking not found or already deleted.",
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

// xoá mềm
export const softDeletGgStacking = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: { ids: string[] } }>,
  reply: FastifyReply
) => {
  try {
    const { ids } = request.body;
    const {id:userId, role} = request.user as { id: string, role: string } ;
    const isAdmin = role === "admin";

    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({
        message: "Invalid request. Please provide a list of IDs.",
        success: false,
      });
    }
    
    // Xóa nhiều bản ghi cùng lúc
    const data = await fastify.prisma.googleStackingRequest.updateMany({
      where: isAdmin ? {
        id:  { in: ids },
        deletedAt: null,
      }: {
        id:  { in: ids },
        userId: userId,
        deletedAt: null, // Chỉ xóa nếu chưa bị xóa trước đó
      },
      data: { deletedAt: new Date() },
    });

    // Kiểm tra nếu không có bản ghi nào được cập nhật
    if (data.count === 0) {
      return reply.status(404).send({
        message: "Google Stacking not found or already deleted.",
        success: false,
      });
    }

    return reply.status(200).send({
      message: `Deleted ${data.count} entities successfully!`,
      success: true,
    });
  } catch (error: any) {
    
    handleErrorResponse(reply, error);
  }
};