import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { ICoupon } from "../../types/coupon";
import { createCouponSchemas } from "../../schema/coupon";
import _ from 'lodash';
const randomCode = parseInt(_.sampleSize("0123456789", 6).join(""), 10);
import { v7 as uuidv7 } from 'uuid';

export const createCoupon = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const formData: any = request.body as ICoupon;

    // Nếu không có code trong formData, tạo mã ngẫu nhiên duy nhất
    if (!formData.code) {
      formData.code = randomCode;
    }

    // Validate input
    const checkValidate:any = createCouponSchemas.safeParse(formData);

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

    const newData = await fastify.prisma.$transaction(async (prisma: any) => {
      const data = await prisma.coupon.create({
        data: {
          id: uuidv7(),
          user: {
            connect: { id: formData.userId },
          },
          code: `CP${formData.code}`,
          couponValue: formData.couponValue,
          redeemedCount: formData.redeemedCount,
          maxRedemptions: formData.maxRedemptions,
          description: formData.description,
          couponType: formData.couponType,
          expiresAt: formData.expiresAt,
        },
      });
      return data;
    });

    return reply
      .status(200)
      .send({ message: "Created data successfully!", success: true, coupon:newData });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
