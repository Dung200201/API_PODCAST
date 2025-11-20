import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";

interface Params {
  id: string; // ID của package dưới dạng chuỗi (sẽ được chuyển thành số)
}

// Khôi phục gói từ thùng rác
export const restorePackage = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) => {
  try {
    const idPk = request.params.id

    // Kiểm tra xem package có tồn tại không
    const existingPackage = await fastify.prisma.packages.findUnique({
      where: { id: idPk },
    });

    if (!existingPackage) {
      return reply.status(404).send({
        message: "Package not found. Please provide a valid ID.",
        success: false,
      });
    }

    if (existingPackage.deletedAt === null) {
      return reply.status(404).send({
        message: "This package does not exist in the trash!",
        success: false,
      });
    }

    // Xóa package
    const data = await fastify.prisma.packages.update({
      where: { id: idPk },
      data: { deletedAt: null },
    });

    if (!data) {
      return reply.status(404).send({
        message: "Deleted faild!",
        success: false,
      });
    }

    return reply.status(200).send({
      message: "Restored packages successfully!",
      success: true,
      packages:data
    });
  } catch (error: any) {
    // Kiểm tra lỗi từ Prisma (nếu không tìm thấy bản ghi)
    if (error.code === "P2025") {
      return reply.status(404).send({
        message: "Package not found. Please provide a valid ID.",
        success: false,
      });
    }
    handleErrorResponse(reply, error);
  }
};
