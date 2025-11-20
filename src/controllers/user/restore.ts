import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";

interface Params {
  id: string; // ID của user dưới dạng chuỗi (sẽ được chuyển thành số)
}

// Khôi phục gói từ thùng rác
export const restoreUser = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) => {
  try {
    const idPk = request.params.id

    // Kiểm tra xem user có tồn tại không
    const existingUser = await fastify.prisma.user.findUnique({
      where: { id: idPk },
    });

    if (!existingUser) {
      return reply.status(404).send({
        message: "User not found. Please provide a valid ID.",
        success: false,
      });
    }

    if (existingUser.deletedAt === null) {
      return reply.status(404).send({
        message: "This user does not exist in the trash!",
        success: false,
      });
    }

    // Xóa user
    const data:any = await fastify.prisma.user.update({
      where: { id: idPk },
      data: { deletedAt: null },
    });

    if (!data) {
      return reply.status(404).send({
        message: "Deleted faild!",
        success: false,
      });
    }

    data.password = undefined;

    return reply.status(200).send({
      message: "Restored user successfully!",
      success: true,
      user:data
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};
