import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { checkUserPoints } from "../../service/checkPoins";
import { translations } from "../../lib/i18n";

export const updateBlog20Status = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const user = request.user
    const { id } = request.params;
    const { id: userId, role, language } = request.user as { id: string, role: string, language: string };
    const isAdmin =
      (role === "admin") ||
      (role === "dev");

    const dataLanguage = language === "auto" ? "vi" : "en"

    // Tìm entity trước
    const blogRequest = await fastify.prisma.blog20Request.findFirst({
      where: !isAdmin ? { id, userId, deletedAt: null } : { id, deletedAt: null },
      select: {
        id: true,
        auction_price: true,
        typeRequest: true
      }
    });

    if (!blogRequest) {
      return reply.status(404).send({
        message: "Blog20 not found or already deleted.",
        success: false,
      });
    }

    // Xác định số lượng giới hạn theo loại request
    // let blog20_limit = 20;
    // if (blogRequest.typeRequest === "register") {
    //   blog20_limit = 10; // nếu là loại "register" thì giới hạn khác
    // } else if (blogRequest.typeRequest === "post") {
    //   blog20_limit = 20;
    // }

    // 4. check điểm người dùng Truy vấn DB để lấy thông tin điểm trong bảng giao dịch
    // const totalUsed = blogRequest.auction_price * blog20_limit;
    const totalUsed = 0;
    const checkPoints = await checkUserPoints(
      fastify,
      user,
      totalUsed
    );

    if (checkPoints.isExpired) {
      return reply.status(401).send({
        message: translations[dataLanguage].services.expiredPoints,
        success: false,
      });
    }

    if (!checkPoints.isEnough) {
      return reply.status(401).send({
        message: `${translations[dataLanguage].services.needMorePointsFirst} ${checkPoints.neededPoints} ${translations[dataLanguage].services.needMorePointsSecond}`,
        success: false,
      });
    }

    // Cập nhật status
    await fastify.prisma.blog20Request.update({
      where: { id },
      data: { status: "new" },
      select: {
        id: true,
      }
    });

    return reply.status(200).send({
      message: "Status updated to 'new' successfully.",
      success: true,
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};
