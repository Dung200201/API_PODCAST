import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
import { handleErrorResponse } from "../../../utils/handleError";
dotenv.config();

export const getModuleSetting = async (
    fastify: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        // Lấy tất cả các key liên quan
        const settings = await fastify.prisma.setting.findMany({
            where: {
                key: {
                    in: [
                        "mail_support_hidden",
                        "mail_support",
                        "telegram_support_hidden",
                        "telegram_support"
                    ]
                }
            }
        });

        // Chuyển sang dạng object
        const config = Object.fromEntries(
            settings.map((setting) => [setting.key, setting.value])
        );

        const response: Record<string, any> = {
            success: true,
            modules: {}
        };

        // Mail logic
        response.modules.mail_support_hidden = config["mail_support_hidden"];
        if (config["mail_support_hidden"] === true) {
            response.modules.mail_support = config["mail_support"] || null;
        }

        // Telegram logic
        response.modules.telegram_support_hidden = config["telegram_support_hidden"];

        if (config["telegram_support_hidden"] === true) {
            response.modules.telegram_support = config["telegram_support"] || null;
        }

        return reply.status(200).send(response);
    } catch (error) {
        handleErrorResponse(reply, error);
    }
};
