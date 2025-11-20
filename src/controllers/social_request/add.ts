import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { v7 as uuidv7 } from "uuid";

function getRandomSuffix() {
  return Math.random().toString(36).substring(2, 6).toUpperCase(); // VD: 'A9X1'
}

export const createSocialRequest = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { id: userId } = request.user as { id: string };
    let { name } = request.body as { name: string };

    name = name.trim().toLowerCase() || "default";

    // 1. Check nếu đã có request có groupId = null
    const existingWithNullGroup = await fastify.prisma.socialRequest.findFirst({
      where: {
        userId,
        deletedAt: null,
        status: "new",
        socialGroupId: null,
      },
      select: { id: true },
    });

    if (existingWithNullGroup) {
      return reply.status(200).send({
        socialRequest: { id: existingWithNullGroup.id },
        success: true,
      });
    }

    // 2. Nếu tên bị trùng thì tạo tên mới với hậu tố random
    const nameExists = await fastify.prisma.socialRequest.findFirst({
      where: {
        userId,
        deletedAt: null,
        name,
      },
      select: { id: true },
    });

    if (nameExists) {
      name = `${name}-${getRandomSuffix()}`;
    }

    // 3. Tạo mới
    const socialRequest = await fastify.prisma.socialRequest.create({
      data: {
        id: uuidv7(),
        userId,
        name,
        status: "new",
      },
    });

    return reply.status(200).send({
      message: "Created data successfully!",
      success: true,
      socialRequest,
    });
  } catch (error) {
    console.error("❌ Error while creating social:", error);
    handleErrorResponse(reply, error);
  }
};
