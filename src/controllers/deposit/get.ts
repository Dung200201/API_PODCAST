import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply } from "fastify";
import dotenv from "dotenv";
dotenv.config();

export const getDepositsDetailById = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    // const lang = request.headers["accept-language"];
    const {id:userId} = request.user as { id: string };
    const { id } = request.params as { id: string };

    // Tìm deposit theo ID và userId
    const depositDetail: any = await fastify.prisma.deposit.findUnique({
      include: { package: true, credit: true, coupon: true, user: { include: { profile: true } } },
      where: { id, userId },
    });

    if (!depositDetail) {
      return reply.status(404).send({
        message: "Deposit not found with the provided ID.",
        success: false,
      });
    }

    let languageData;
    if(depositDetail.user.profile.language === "AUTO"){
      const lang = request.headers["accept-language"] || "";
      languageData = lang.startsWith("vi") ? "VI" : "EN";
    }else{
      languageData === "EN"
    }

    // Kiểm tra ngôn ngữ
    const isVietnamese = languageData === "VI";

    // Chọn đơn vị tiền tệ phù hợp
    const packagePrice = isVietnamese ? depositDetail.package.price_vnd : depositDetail.package.price_usd;
    const couponValue = isVietnamese ? depositDetail.coupon?.couponValueVND || 0 : depositDetail.coupon?.couponValue || 0;

    // Tính toán subtotal và total
    const subtotal = packagePrice * depositDetail.quantity;
    const total = depositDetail.couponId ? Math.max(0, subtotal - couponValue) : subtotal;


    return reply.status(200).send({
      message: "Deposit details fetched successfully.",
      success: true,
      pttt: isVietnamese ? [{ name: "QRCODE" }, { name: "PAYPAL" }] : [{ name: "PAYPAL" }],
      deposit: {
        ...depositDetail,
        subtotal,
        total,
      },
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
