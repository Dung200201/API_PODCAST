import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";

export const getPodcastAccountByRequestId = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { idRequest } = request.params as { idRequest: string };
    const { id: userId, role } = request.user as { id: string; role: string };

    // 1️⃣ Tìm request type = register
    const podcastRequest = await fastify.prisma.podcastRequest.findFirst({
      where: {
        id: idRequest,
        typeRequest: "register",
      },
      select: {
        id: true,
        name: true,
        podcastGroupId: true,
        userId: true,
      },
    });

    if (!podcastRequest) {
      return reply.status(404).send({
        message: "Request not found or not a register-type request",
        success: false,
      });
    }

    // 2️⃣ Check quyền user
    const isAdmin = role === "admin";

    if (!isAdmin && podcastRequest.userId !== userId) {
      return reply.status(403).send({
        message: "Access denied: This request does not belong to you",
        success: false,
      });
    }

    if (!podcastRequest.podcastGroupId) {
      return reply.status(400).send({
        message: "This request has no podcastGroupId",
        success: false,
      });
    }

    // 3️⃣ Lấy tất cả PodcastAccount theo blogGroupId
    const accounts = await fastify.prisma.podcastAccount.findMany({
      where: {
        podcastGroupId: podcastRequest.podcastGroupId,
        deletedAt: null, // chỉ lấy active (tuỳ chọn)
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        website: true,
        username: true,
        email: true,
        password: true,
        app_password: true,
        twoFA: true,
        note: true,
        status: true,
        createdAt: true,
      },
    });

    return reply.status(200).send({
      success: true,
      message: "Retrieve accounts successfully!",
      requestInfo: {
        id: podcastRequest.id,
        name: podcastRequest.name,
        podcastGroupId: podcastRequest.podcastGroupId,
      },
      total_accounts: accounts.length,
      accounts,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
