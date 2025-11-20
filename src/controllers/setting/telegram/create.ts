import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
import { handleErrorResponse } from "../../../utils/handleError";
dotenv.config();
import { v7 as uuidv7 } from "uuid"
import { SettingType } from "@prisma/client";
import { TelegramSettingRequest, TelegramSettingSchema } from "../../../schema/setting";

export const createTelegramSetting = async (
    fastify: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {

        // validate
        const parsed = TelegramSettingSchema.safeParse(request.body);

        if (!parsed.success) {
            return reply.status(400).send({
                success: false,
                message: "Validation failed",
                errors: parsed.error.flatten().fieldErrors
            });
        }

        // form telegram
        const { telegram_support, telegram_support_hidden } = request.body as TelegramSettingRequest;

        // Tạo danh sách config để insert
        const settingsToCreate = [];

        if (telegram_support !== undefined) {
            settingsToCreate.push({
                key: "telegram_support",
                value: telegram_support,
                type: SettingType.string,
            });
        }

        if (telegram_support_hidden !== undefined) {
            settingsToCreate.push({
                key: "telegram_support_hidden",
                value: telegram_support_hidden,
                type: SettingType.boolean,
            });
        }

        // Insert tất cả dòng
        const insertedSettings = [];
        for (const setting of settingsToCreate) {
            const existing = await fastify.prisma.setting.findFirst({
                where: { key: setting.key, group: "telegram" },
            });

            let result;

            if (existing) {
                result = await fastify.prisma.setting.update({
                    where: { id: existing.id }, // ✅ ID là khóa chính
                    data: {
                        value: setting.value,
                        type: setting.type,
                        group: "telegram"
                    }
                });
            } else {
                result = await fastify.prisma.setting.create({
                    data: {
                        id: uuidv7(),
                        key: setting.key,
                        value: setting.value,
                        type: setting.type,
                        group: "telegram"
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