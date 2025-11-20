import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export const getCouponDetailById = async(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    // Lấy id từ params của request
    const { id } = request.params as { id: string };
    // Kiểm tra id hợp lệ hay không
    if (!id || isNaN(Number(id))) {
      return reply.status(400).send({
        message: "Invalid ID. Please provide a valid numeric ID.",
        success: false,
      });
    }

    // Tìm coupon trong cơ sở dữ liệu theo id
    const couponDetail = await fastify.prisma.coupon.findUnique({
      where: { id: id } as any,
    });
    // Nếu không tìm thấy, trả về thông báo lỗi
    if (!couponDetail) {
      return reply.status(404).send({
        message: "Coupon not found with the provided ID.",
        success: false,
      });
    }
    // Trả về dữ liệu chi tiết coupon
    return reply.status(200).send({
      message: "Coupon details fetched successfully.",
      success: true,
      coupon: couponDetail,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
