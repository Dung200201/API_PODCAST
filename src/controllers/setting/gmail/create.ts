import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
import { handleErrorResponse } from "../../../utils/handleError";
dotenv.config();
import { v7 as uuidv7 } from "uuid"
import { encrypt } from "../../../utils/encrypt";
import { SettingType } from "@prisma/client";
import { GmailSettingRequest } from "../../../types/setting";
import { GmailSettingSchema } from "../../../schema/setting";

export const createGmailSetting = async (
    fastify: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {

        // validate
        const parsed = GmailSettingSchema.safeParse(request.body);

        if (!parsed.success) {
            return reply.status(400).send({
                success: false,
                message: "Validation failed",
                errors: parsed.error.flatten().fieldErrors
            });
        }

        // form body
        const { mail_support, mail_sender, smtp_host, smtp_port, username, password, mail_enabled, mail_support_hidden } = request.body as GmailSettingRequest;

        // Tạo danh sách config để insert
        const settingsToCreate = [];

        if (mail_support !== undefined) {
            settingsToCreate.push({
                key: "mail_support",
                value: mail_support,
                type: SettingType.string,
            });
        }

        if (mail_support_hidden !== undefined) {
            settingsToCreate.push({
                key: "mail_support_hidden",
                value: mail_support_hidden,
                type: SettingType.boolean,
            });
        }

        if (mail_sender !== undefined) {
            settingsToCreate.push({
                key: "mail_sender",
                value: mail_sender,
                type: SettingType.string,
            });
        }

        if (smtp_host !== undefined) {
            settingsToCreate.push({
                key: "smtp_host",
                value: smtp_host,
                type: SettingType.string,
            });
        }

        if (smtp_port !== undefined) {
            settingsToCreate.push({
                key: "smtp_port",
                value: smtp_port,
                type: SettingType.number,
            });
        }

        if (username !== undefined) {
            settingsToCreate.push({
                key: "mail_username",
                value: username,
                type: SettingType.string,
            });
        }

        if (password !== undefined && password !== "") {
            settingsToCreate.push({
                key: "mail_password",
                value: encrypt(password),
                type: SettingType.encrypted,
            });
        }

        if (mail_enabled !== undefined) {
            settingsToCreate.push({
                key: "mail_enabled",
                value: mail_enabled,
                type: SettingType.boolean,
            });
        }

        // Insert tất cả dòng
        const insertedSettings = [];
        for (const setting of settingsToCreate) {
            const existing = await fastify.prisma.setting.findFirst({
                where: { key: setting.key, group: "mail" },
            });

            let result;

            if (existing) {
                result = await fastify.prisma.setting.update({
                    where: { id: existing.id }, // ✅ ID là khóa chính
                    data: {
                        value: setting.value,
                        type: setting.type,
                        group: "mail"
                    }
                });
            } else {
                result = await fastify.prisma.setting.create({
                    data: {
                        id: uuidv7(),
                        key: setting.key,
                        value: setting.value,
                        type: setting.type,
                        group: "mail"
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