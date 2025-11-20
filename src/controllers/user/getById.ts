import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export const getUseryId = async(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    // Lấy id từ params của request
    const { id } = request.params as { id: string };

    // Tìm user trong cơ sở dữ liệu theo id
    const user:any = await fastify.prisma.user.findUnique({
      where: { id: id },
      include: { profile: true },
    });
    // Nếu không tìm thấy, trả về thông báo lỗi
    if (!user) {
      return reply.status(404).send({
        message: "Account not found with the provided ID.",
        success: false,
      });
    }

    user.password = undefined
    // Trả về dữ liệu chi tiết user
    return reply.status(200).send({
      message: "Account details fetched successfully.",
      success: true,
      user: user,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
