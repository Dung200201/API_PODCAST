import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";

export const getBlgo20AccountByRequestId = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { idRequest } = request.params as { idRequest: string };
    const { id: userId, role } = request.user as { id: string; role: string };

    // 1️⃣ Tìm request type = register
    const blogRequest = await fastify.prisma.blog20Request.findFirst({
      where: {
        id: idRequest,
        typeRequest: "register",
      },
      select: {
        id: true,
        name: true,
        blogGroupId: true,
        userId: true,
      },
    });

    if (!blogRequest) {
      return reply.status(404).send({
        message: "Request not found or not a register-type request",
        success: false,
      });
    }

    // 2️⃣ Check quyền user
    const isAdmin = role === "admin";

    if (!isAdmin && blogRequest.userId !== userId) {
      return reply.status(403).send({
        message: "Access denied: This request does not belong to you",
        success: false,
      });
    }

    if (!blogRequest.blogGroupId) {
      return reply.status(400).send({
        message: "This request has no blogGroupId",
        success: false,
      });
    }

    // 3️⃣ Lấy tất cả Blog20Account theo blogGroupId
    const accounts = await fastify.prisma.blog20Account.findMany({
      where: {
        blogGroupId: blogRequest.blogGroupId,
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
        quickLink: true,
        homeLink: true,
        note: true,
        status: true,
        createdAt: true,
      },
    });

    return reply.status(200).send({
      success: true,
      message: "Retrieve accounts successfully!",
      requestInfo: {
        id: blogRequest.id,
        name: blogRequest.name,
        blogGroupId: blogRequest.blogGroupId,
      },
      total_accounts: accounts.length,
      accounts,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
