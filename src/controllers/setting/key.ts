import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
import { v7 as uuidv7 } from "uuid"
import { encrypt } from "../../utils/encrypt";
dotenv.config();

export const createKeySetting = async (
    fastify: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        const { key, value, group, isEncrypt, type }: any = request.body;
        const dataRequest: any = {
            id: uuidv7(),
            key: key,
            type: type,
            value: isEncrypt ? encrypt(value) : value,
            group: group
        }

        const result = await fastify.prisma.setting.create({
            data: dataRequest,
        });

        return reply.status(201).send({
            success: true,
            setting: result,
        });
    } catch (error) {
        handleErrorResponse(reply, error);
    }
};
