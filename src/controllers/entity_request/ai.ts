import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
import { getGeminiResponse } from "../../service/ai";
dotenv.config();

export const getContentByAI = async (
    fastify: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        const { message, language } = request.body as any;
        const result = await getGeminiResponse(message, language);

        // Trả về dữ liệu chi tiết indedx
        return reply.status(200).send({
            success: true,
            result
        });
    } catch (error) {
        handleErrorResponse(reply, error);
    }
};