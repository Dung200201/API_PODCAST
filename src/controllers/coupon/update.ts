import { updateCouponSchemas } from "../../schema/coupon";
import { ICoupon } from "../../types/coupon";
import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
interface Params {
    id: string;
}
export const updateCoupon = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) => {
  
  try {
    const formData = request.body as ICoupon;
    const idPk = request.params.id; 

    // Validate input
    const checkValidate:any = updateCouponSchemas.safeParse(formData);

    if (!checkValidate.success) {
      const allErrors = checkValidate.error.errors.map((err:any) => err.message).join(', ');
      return reply.status(400).send({
        message: allErrors,
      });
    }
    
    if (formData.redeemedCount >= formData.maxRedemptions) {
      return reply.status(400).send({
        message: "The coupon has already reached its redemption limit.",
        success: false,
      });
    }

    const timeNow = new Date();

    // Kiểm tra nếu expiresAt không hợp lệ
    if (isNaN(new Date(formData.expiresAt).getTime())) {
      return reply.status(400).send({
        message: "The expiresAt date is invalid.",
        success: false,
      });
    }
    
    // Kiểm tra nếu coupon đã hết hạn
    if (new Date(formData.expiresAt) < timeNow) {
      return reply.status(400).send({
        message: "The coupon has expired and is no longer valid.",
        success: false,
      });
    }

    // Cập nhật dữ liệu gói
    const updatedCoupon = await fastify.prisma.coupon.update({
      where: { id: idPk }, // Xác định gói cần cập nhật dựa trên ID
      data: {
        user: {
          connect: { id: formData.userId } as any,
        },
        couponValue: formData.couponValue,
        redeemedCount: formData.redeemedCount,
        maxRedemptions: formData.maxRedemptions,
        description: formData.description,
        couponType: formData.couponType,
        expiresAt: formData.expiresAt,
      },
    });
    return reply
      .status(200)
      .send({
        message: "Update data successfully!",
        success: true,
        coupon: updatedCoupon,
      });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
