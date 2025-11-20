import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";

interface Params {
  id: string; // ID của credit dưới dạng chuỗi (sẽ được chuyển thành số)
}

// Khôi phục gói từ thùng rác
export const restoreCredit = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) => {
  try {
    const idPk = request.params.id

    // Kiểm tra xem credit có tồn tại không
    const existingredit = await fastify.prisma.credit.findUnique({
      where: { id: idPk },
    });

    if (!existingredit) {
      return reply.status(404).send({
        message: "Package not found. Please provide a valid ID.",
        success: false,
      });
    }

    if (existingredit.deletedAt === null) {
      return reply.status(404).send({
        message: "This credit does not exist in the trash!",
        success: false,
      });
    }

    // Xóa credit
    const data = await fastify.prisma.credit.update({
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
      message: "Restored credit successfully!",
      success: true,
      credit:data
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};
