import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";

interface Params {
  id: string; // ID của user dưới dạng chuỗi (sẽ được chuyển thành số)
}

// xoá vĩnh viễn
export const deleteUser = async (
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
          message: "The user has been removed!",
          success: false,
        });
    }

    // Xóa user
    const data = await fastify.prisma.user.delete({
      where: { id: idPk },
    });

    if (!data) {
      return reply.status(404).send({
        message: "Deleted faild!",
        success: false,
      });
    }

    return reply.status(200).send({
      message: "Deleted user successfully!",
      success: true,
      user: data
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};

// xoá mềm
export const softDeleteUser = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) => {
  try {
    const idPk = request.params.id
 
    // Kiểm tra xem user có tồn tại không
    const user  = await fastify.prisma.user.findUnique({
      where: { id: idPk },
    });

    if (!user) {
      return reply.status(404).send({
        message: "User not found. Please provide a valid ID.",
        success: false,
      });
    }

    if (user.deletedAt !== null) {
      return reply.status(404).send({
        message: "The user has been removed!",
        success: false,
      });
    }

    // Xóa user
    const data: any = await fastify.prisma.user.update({
      where: { id: idPk },
      data: { deletedAt: new Date() },
    });

    if (!data) {
      return reply.status(404).send({
        message: "Deleted faild!",
        success: false,
      });
    }

    data.password = undefined;

    return reply.status(200).send({
      message: "Deleted user successfully!",
      success: true,
      user:data
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};
