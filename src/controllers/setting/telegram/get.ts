import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
import { handleErrorResponse } from "../../../utils/handleError";
dotenv.config();

export const getTelegramSetting = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const settings = await fastify.prisma.setting.findMany({
      where: {
        group: "telegram"
      }
    });

    // Biến mảng thành object: { key: value }
    const telegramConfig = Object.fromEntries(
      settings.map((setting) => [setting.key, setting.value])
    );

    return reply.status(200).send({
      success: true,
      config: telegramConfig
    });

  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
