import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { checkUserPoints } from "../../service/checkPoins";
import { translations } from "../../lib/i18n";

export const updatePodcastRequestStatus = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const user = request.user;
    const { id } = request.params;
    const { id: userId, role, language } = request.user as {
      id: string;
      role: string;
      language: string;
    };

    const isAdmin = role === "admin" || role === "dev";

    // Ngôn ngữ chuẩn
    const dataLanguage = language === "auto" ? "vi" : language;

    // 1. Lấy thông tin podcast request
    const podcastRequest = await fastify.prisma.podcastRequest.findFirst({
      where: !isAdmin
        ? { id, userId, deletedAt: null }
        : { id, deletedAt: null },
      select: {
        id: true,
        auction_price: true,
        target: true,
        status: true,
      },
    });

    if (!podcastRequest) {
      return reply.status(404).send({
        message: "Podcast request not found or already deleted.",
        success: false,
      });
    }

    // 2. Chỉ cho phép update nếu đang draft
    if (podcastRequest.status !== "draft") {
      return reply.status(400).send({
        message: "This podcast request has already been activated.",
        success: false,
      });
    }

    // 3. Tính số điểm cần thiết
    // target có thể null => mặc định 0
    const target = podcastRequest.target ?? 0;
    const totalUsed = podcastRequest.auction_price * target;

    // 4. Check điểm của người dùng
    const checkPoints = await checkUserPoints(fastify, user, totalUsed);

    if (checkPoints.isExpired) {
      return reply.status(401).send({
        message: translations[dataLanguage as keyof typeof translations].services.expiredPoints,
        success: false,
      });
    }

    if (!checkPoints.isEnough) {
      return reply.status(401).send({
        message: `${translations[dataLanguage as keyof typeof translations].services.needMorePointsFirst} ${checkPoints.neededPoints} ${translations[dataLanguage as keyof typeof translations].services.needMorePointsSecond}`,
        success: false,
      });
    }

    // 5. Cập nhật status
    await fastify.prisma.podcastRequest.update({
      where: { id },
      data: { status: "new" },
    });

    return reply.status(200).send({
      message: "Podcast status updated to 'new' successfully.",
      success: true,
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};
