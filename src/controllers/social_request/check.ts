import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
import { IId_Tool } from "../../types/generate";
dotenv.config();

export const getSocialRequestPending = async(
  fastify: FastifyInstance,
  request: FastifyRequest<{ Querystring: IId_Tool }>,
  reply: FastifyReply
) => {
  try {
    const { id_tool } = request.query;

    if (!id_tool) {
      return reply.status(400).send({
        message: "`id_tool` is required in query params.",
        success: false,
      });
    }

    const social:any = await fastify.prisma.socialRequest.findFirst({
      where: { status: "running", id_tool: id_tool, deletedAt: null },
      select: {
        id: true,
        user : true,
        socialgroup: true,
        status: true,
        data: true,
        updatedAt: true,
      },
    });

    // Nếu không tìm thấy, trả về thông báo lỗi
    if (!social) {
      return reply.status(404).send({
        message: "No running social request found for the specified tool.",
        success: false,
      });
    }

    // Trả về dữ liệu chi tiết indedx
    return reply.status(200).send({
        message: "Social request retrieved successfully.",
        success: true,
        social_request: social,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};