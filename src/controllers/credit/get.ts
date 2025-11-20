import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export const getCreditDetailById = async(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    // Lấy id từ params của request
    const { id } = request.params as { id: string };
 
    // Tìm credit trong cơ sở dữ liệu theo id
    const creditDetail = await fastify.prisma.credit.findUnique({
      where: { id: id },
    });

    // Nếu không tìm thấy, trả về thông báo lỗi
    if (!creditDetail) {
      return reply.status(404).send({
        message: "Credit not found with the provided ID.",
        success: false,
      });
    }

    // Trả về dữ liệu chi tiết credit
    return reply.status(200).send({
      message: "Credit details fetched successfully.",
      success: true,
      data: creditDetail,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
