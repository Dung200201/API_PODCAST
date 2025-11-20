import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
import { handleErrorResponse } from "../../../utils/handleError";
dotenv.config();

export const getGmailSetting = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const settings = await fastify.prisma.setting.findMany({
      where: {
        group: "mail"
      }
    });

    // Lọc bỏ mail_password khỏi kết quả
    const filtered = settings.filter((s) => s.key !== "mail_password");

    // Biến mảng thành object: { key: value }
    const gmailConfig = Object.fromEntries(
      filtered.map((setting) => [setting.key, setting.value])
    );

    return reply.status(200).send({
      success: true,
      config: gmailConfig
    });

  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
