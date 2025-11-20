import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
dotenv.config();
import { v7 as uuidv7 } from "uuid"
import { handleErrorResponse } from "../../utils/handleError";

export const createTranslate = async (
    fastify: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        // form telegram
        const { likepion_tool_name, likepion_tool_slug, likepion_tool_short_description, likepion_tool_long_description, recordId, table, language } = request.body as any;

        // Tạo danh sách config để insert
        const translateToCreate = [];

        if (likepion_tool_name !== undefined) {
            translateToCreate.push({
                key: "likepion_tool_name",
                value: likepion_tool_name,
            });
        }

        if (likepion_tool_slug !== undefined) {
            translateToCreate.push({
                key: "likepion_tool_slug",
                value: likepion_tool_slug,
            });
        }
        if (likepion_tool_short_description !== undefined) {
            translateToCreate.push({
                key: "likepion_tool_short_description",
                value: likepion_tool_short_description,
            });
        }
        if (likepion_tool_long_description !== undefined) {
            translateToCreate.push({
                key: "likepion_tool_long_description",
                value: likepion_tool_long_description,
            });
        }

        // Insert tất cả dòng
        const insertedSettings = [];
        for (const translate of translateToCreate) {
            const existing = await fastify.prisma.translation.findFirst({
                where: {
                    key: translate.key,
                    recordId,
                    table,
                    language,
                },
            });


            let result;

            if (existing) {
                result = await fastify.prisma.translation.update({
                    where: { id: existing.id }, // ✅ ID là khóa chính
                    data: {
                        value: translate.value,
                        recordId,
                        table,
                        language
                    }
                });
            } else {
                result = await fastify.prisma.translation.create({
                    data: {
                        id: uuidv7(),
                        key: translate.key,
                        value: translate.value,
                        recordId,
                        table,
                        language
                    }
                });
            }

            insertedSettings.push(result);
        }

        return reply.status(201).send({
            success: true,
            settings: insertedSettings,
        });


    } catch (error) {
        handleErrorResponse(reply, error);
    }
};