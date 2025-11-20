import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";

interface Params {
  id: string; // ID của credit dưới dạng chuỗi (sẽ được chuyển thành số)
}

export const deleteCredit = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) => {
  try {
    const idCr = request.params.id

    // Kiểm tra xem credit có tồn tại không
    const existingCredit = await fastify.prisma.credit.findUnique({
      where: { id: idCr },
    });

    if (!existingCredit) {
      return reply.status(404).send({
        message: "Credit not found. Please provide a valid ID.",
        success: false,
      });
    }

    // Xóa credit
    const data = await fastify.prisma.credit.delete({
      where: { id: idCr },
    });

    if (!data) {
      return reply.status(404).send({
        message: "Deleted faild!",
        success: false,
      });
    }

    return reply.status(200).send({
      message: "Deleted credit successfully!",
      success: true,
      credit: data
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};


// xoá mềm
export const softDeleteCredit = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) => {
  try {
    const idPk = request.params.id;

   

    // Kiểm tra xem credit có tồn tại không
    const existingCredit = await fastify.prisma.credit.findUnique({
      where: { id: idPk },
    });

    if (!existingCredit) {
      return reply.status(404).send({
        message: "Credit not found. Please provide a valid ID.",
        success: false,
      });
    }

    if (existingCredit.deletedAt !== null) {
      return reply.status(404).send({
        message: "The credit has been removed!",
        success: false,
      });
    }

    // Xóa credit
    const data = await fastify.prisma.credit.update({
      where: { id: idPk },
      data: { deletedAt: new Date() },
    });

    if (!data) {
      return reply.status(404).send({
        message: "Deleted faild!",
        success: false,
      });
    }

    return reply.status(200).send({
      message: "Deleted credit successfully!",
      success: true,
      credit:data
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};
