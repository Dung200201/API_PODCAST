import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
import { getUserPreferences } from "../../service/getLanguageDb";
import { translations } from "../../lib/i18n";
import { checkUserPoints } from "../../service/checkPoins";
import { IUser } from "../../types/user";
import { checkForbiddenWords } from "../../service/checkBlockWords";
import { forbiddenWordsName } from "../../utils/blocked_words";
import { z } from "zod";
import _ from "lodash";

dotenv.config();

const podcastRequestUpdateSchema = z.object({
    podcastGroupId: z.string().optional(),
    id_tool: z.string().optional(),
    typeRequest: z.string().optional(),
    target: z.number().int().min(0).max(1000).optional(),
    data: z.any().optional(),
    name: z.string().min(1).max(155).optional(),
    auction_price: z.number().int().min(1).max(255).optional(),
    status: z.string().optional(),
});

const stripBackslash = (val?: string) => {
    if (typeof val !== "string") return val;
    return val.replace(/^\\+/, "").trimStart();
};

export const updatePodcastRequest = async (
    fastify: FastifyInstance,
    request: FastifyRequest<{
        Params: { id: string };
        Body: any;
    }>,
    reply: FastifyReply
) => {
    try {
        const { id } = request.params;
        const updateData = request.body as Record<string, any>;
        const user = request.user as IUser;

        let {
            id_tool,
            target,
            name,
            auction_price,
            // status,
            podcastGroupId,
        } = updateData;

        const { id: userId, role, type } = user;
        const isAdmin = ["admin", "dev"].includes(role) || type === "priority";

        // Lấy ngôn ngữ
        const { language: dataLanguage } = await getUserPreferences(
            fastify,
            request,
            userId
        );

        // Lấy request cũ
        const existingRequest = await fastify.prisma.podcastRequest.findUnique({
            where: !isAdmin
                ? { id, userId, deletedAt: null }
                : { id, deletedAt: null },
        });

        if (!existingRequest) {
            return reply.status(404).send({
                message: "Podcast request not found",
                success: false,
            });
        }

        // Không có dữ liệu update
        if (Object.keys(updateData).length === 0) {
            return reply.status(400).send({
                message: "No data provided for update",
                success: false,
            });
        }

        // Validate podcastGroupId nếu có
        if (podcastGroupId) {
            const groupExists = await fastify.prisma.podcastGroup.findUnique({
                where: { id: podcastGroupId }
            });

            if (!groupExists) {
                return reply.status(400).send({
                    message: "PodcastGroup not found",
                    success: false,
                });
            }
        }

        // User thường validate bằng Zod
        if (!isAdmin) {
            const checkValidate = podcastRequestUpdateSchema.safeParse(updateData);
            if (!checkValidate.success) {
                const allErrors = checkValidate.error.errors
                    .map((err) => err.message)
                    .join(", ");
                return reply.status(400).send({
                    message: allErrors,
                    success: false,
                });
            }
        }

        // Không cho user update id_tool
        if (!isAdmin && id_tool) {
            return reply.status(403).send({
                message: "You cannot update id_tool",
                success: false,
            });
        }

        // Sanitize name
        name = stripBackslash(name);

        if (name && !isAdmin) {
            const forbiddenCheck = [
                { field: "name", value: name, words: forbiddenWordsName },
            ];

            const forbiddenResult = checkForbiddenWords(forbiddenCheck);
            if (!forbiddenResult.success) {
                return reply.status(400).send({
                    message: forbiddenResult.message,
                    success: false,
                });
            }
        }

        // Limit target
        if (!isAdmin && target && target > 1000) {
            return reply.status(400).send({
                message: "Target maximum is 1000",
                success: false,
            });
        }

        // Kiểm tra điểm khi update auction_price hoặc target
        if (
            (typeof auction_price !== "undefined" &&
                auction_price !== existingRequest.auction_price) ||
            (typeof target !== "undefined" &&
                target !== existingRequest.target)
        ) {
            const effectiveAuctionPrice =
                typeof auction_price !== "undefined"
                    ? auction_price
                    : existingRequest.auction_price ?? 20;

            const effectiveTarget =
                typeof target !== "undefined"
                    ? target
                    : existingRequest.target ?? 0;

            const totalUsed = Number(effectiveAuctionPrice) * Number(effectiveTarget);

            let chargeUser: IUser = user;

            if (isAdmin) {
                const targetUser = await fastify.prisma.user.findUnique({
                    where: { id: existingRequest.userId },
                });

                if (!targetUser) {
                    return reply.status(404).send({
                        message: "Target user not found",
                        success: false,
                    });
                }

                chargeUser = targetUser as any;
            }

            const checkPoints = await checkUserPoints(fastify, chargeUser, totalUsed);

            if (!checkPoints.isEnough) {
                return reply.status(401).send({
                    message: `${translations[dataLanguage].services.needMorePointsFirst} ${checkPoints.neededPoints} ${translations[dataLanguage].services.needMorePointsSecond}`,
                    success: false,
                });
            }
        }

        // Parse old data
        const oldDataString = existingRequest.data ?? null;
        let oldDataParsed = null;
        if (oldDataString) {
            try {
                oldDataParsed = JSON.parse(oldDataString);
            } catch (e) {
                oldDataParsed = oldDataString;
            }
        }

        // Prepare new data
        let newDataString: string | null = null;
        let newDataParsed = null;

        if (updateData.data !== undefined) {
            if (typeof updateData.data === "string") {
                newDataString = updateData.data;
                try {
                    newDataParsed = JSON.parse(updateData.data);
                } catch (e) {
                    newDataParsed = updateData.data;
                }
            } else {
                newDataParsed = updateData.data;
                newDataString = JSON.stringify(updateData.data);
            }
        }

        // Kiểm tra thay đổi
        const hasChanges = Object.keys(updateData).some((key) => {
            if (key === "data") {
                const isEqual = _.isEqual(newDataParsed, oldDataParsed);
                return !isEqual;
            }
            const oldValue = (existingRequest as any)[key];
            const newValue = updateData[key];
            return newValue !== oldValue;
        });

        if (!hasChanges) {
            return reply.status(200).send({
                success: true,
                message: "No changes detected",
            });
        }

        // Chuẩn bị data để update
        const dataToUpdate: any = {};

        // Thêm các fields thông thường (trừ data)
        Object.keys(updateData).forEach(key => {
            if (key !== 'data') {
                dataToUpdate[key] = updateData[key];
            }
        });

        // Xử lý riêng field data
        if (newDataString !== null) {
            dataToUpdate.data = newDataString;
        }

        // Thêm name đã sanitize nếu có
        if (name !== undefined) {
            dataToUpdate.name = name;
        }

        dataToUpdate.updatedAt = new Date();

        console.log('=== DATA TO UPDATE ===');
        console.log(JSON.stringify(dataToUpdate, null, 2));

        // Update vào DB
        const updated = await fastify.prisma.podcastRequest.update({
            where: { id },
            data: dataToUpdate,
        });

        console.log('=== UPDATED RESULT ===');
        console.log('Data field:', updated.data);

        return reply.status(200).send({
            success: true,
            message: "Podcast request updated successfully",
            data: updated, // Trả về data đã update để verify
        });

    } catch (error) {
        console.log('=== ERROR ===', error);
        handleErrorResponse(reply, error);
    }
};