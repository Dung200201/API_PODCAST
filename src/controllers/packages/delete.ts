import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";

interface Params {
  id: string; // ID của package dưới dạng chuỗi (sẽ được chuyển thành số)
}

export const deletePackage = async (
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
        message: "This point package cannot be permanently deleted!",
        success: false,
      });
    }

    // Xóa package
    const data = await fastify.prisma.packages.delete({
      where: { id: idPk },
    });

    if (!data) {
      return reply.status(404).send({
        message: "Deleted faild!",
        success: false,
      });
    }

    return reply.status(200).send({
      message: "Deleted packages successfully!",
      success: true,
      packages:data
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};

// xoá mềm
export const softDeletePackage = async (
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

    if (existingPackage.deletedAt !== null) {
      return reply.status(404).send({
        message: "The package has been removed!",
        success: false,
      });
    }

    // Xóa package
    const data = await fastify.prisma.packages.update({
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
      message: "Deleted packages successfully!",
      success: true,
      packages:data
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};
