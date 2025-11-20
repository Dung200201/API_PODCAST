import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
dotenv.config();

// Định nghĩa kiểu dữ liệu của request params
interface IndexRequestParams {
  id: string;
}

export const getIndexRequestById = async(
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: IndexRequestParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params as { id: string };
    const {id:userId, role} = request.user as { id: string; role: string };

    const isAdmin = role === "admin" || role === "dev";

    const indexRes:any = await fastify.prisma.indexRequest.findUnique({
      where:  isAdmin ? { id, domains: "likepion" } :{ id: id, userId, deletedAt: null, domains: "likepion" },
      select: {
        id: true,
        ...(isAdmin && {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        }),
        ...(isAdmin && {
          domains: true,
        }),
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Nếu không tìm thấy, trả về thông báo lỗi
    if (!indexRes) {
      return reply.status(404).send({
        message: "Index not found with the provided ID.",
        success: false,
      });
    }

    indexRes.deletedAt = undefined;
    return reply.status(200).send({
      success: true,
      index: indexRes,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};