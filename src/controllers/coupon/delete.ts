import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";

interface Params {
  id: string; 
}

export const deleteCoupon = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) => {
  try {
    const idPk = request.params.id;

    // Kiểm tra xem coupon có tồn tại không
    const existingCoupon = await fastify.prisma.coupon.findUnique({
      where: { id: idPk },
    });

    if (!existingCoupon) {
      return reply.status(404).send({
        message: "Coupon not found. Please provide a valid ID.",
        success: false,
      });
    }

    // Xóa Coupon
    const data = await fastify.prisma.coupon.delete({
      where: { id: idPk },
    });

    if (!data) {
      return reply.status(404).send({
        message: "Deleted faild!",
        success: false,
      });
    }

    return reply.status(200).send({
      message: "Deleted coupon successfully!",
      success: true,
      coupon:data
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};
