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

dotenv.config();

const blog20RequestUpdateSchema = z.object({
    blogGroupId: z.string().optional(),
    id_tool: z.string().optional(),
    typeRequest: z.string().optional(),
    target: z.number().int().min(0).max(1000).optional(),
    data: z.string().optional(),
    name: z.string().min(1).max(155).optional(),
    auction_price: z.number().int().min(1).max(255).optional(),
    status: z.string().optional(),
});

const stripBackslash = (val?: string) => {
    if (typeof val !== "string") return val;
    return val.replace(/^\\+/, "").trimStart();
};

export const updateBlog20Request = async (
    fastify: FastifyInstance,
    request: FastifyRequest<{
        Params: { id: string };
        Body: any;
    }>,
    reply: FastifyReply
) => {
    try {
        const { id } = request.params;
        const formData = request.body as Record<string, any>;
        const { ...updateData } = formData;
        const user = request.user as IUser;

        let {
            id_tool,
            target,
            name,
            auction_price,
            status,
        } = updateData;

        const { id: userId, role, type } = request.user as {
            id: string;
            role: string;
            type: string;
        };
        const isAdmin = ["admin", "dev"].includes(role) || type === "priority";

        // 📌 Lấy ngôn ngữ hiện tại của người dùng
        const { language: dataLanguage } = await getUserPreferences(
            fastify,
            request,
            userId
        );

        // 📌 Lấy request cũ từ database
        const existingRequest: any = await fastify.prisma.blog20Request.findUnique(
            {
                where: !isAdmin
                    ? { id: id, userId, deletedAt: null }
                    : { id: id, deletedAt: null },
            }
        );

        if (!existingRequest) {
            return reply.status(404).send({
                message: "Blog request not found",
                success: false,
            });
        }

        if (Object.keys(updateData).length === 0) {
            return reply.status(400).send({
                message: "No data provided for update",
                success: false,
            });
        }

        // ⚡ Xử lý riêng cho admin update status
        if (id_tool && status && isAdmin) {
            await fastify.prisma.blog20Request.update({
                where: { id },
                data: {
                    status: status,
                    id_tool: id_tool,
                    updatedAt: new Date(),
                },
            });

            return reply.status(200).send({
                success: true,
                message: "Blog request updated successfully",
            });
        }

        // 🔒 Validate dữ liệu đầu vào (chỉ với user thường)
        if (!isAdmin) {
            const checkValidate = blog20RequestUpdateSchema.safeParse(formData);
            if (!checkValidate.success) {
                const allErrors = checkValidate.error.errors
                    .map((err: any) => err.message)
                    .join(", ");
                return reply.status(400).send({
                    message: allErrors,
                });
            }
        }

        // 🧹 Sanitize dữ liệu
        name = stripBackslash(name);

        if (name) {
            // Kiểm tra từ cấm trong tên
            if (!isAdmin) {
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
        }

        // 🔢 Giới hạn target (số lượng bài viết tối đa)
        const maxTarget = 1000;
        if (!isAdmin && target && target > maxTarget) {
            return reply.status(400).send({
                message: `Target maximum is ${maxTarget}`,
                success: false,
            });
        }

        // 🔥 Kiểm tra điểm người dùng khi thay đổi auction_price hoặc target
        if (
            (typeof auction_price !== "undefined" &&
                auction_price !== existingRequest.auction_price) ||
            (typeof target !== "undefined" && target !== existingRequest.target)
        ) {
            // Lấy giá trị sau cập nhật
            const effectiveAuctionPrice =
                typeof auction_price !== "undefined"
                    ? auction_price
                    : existingRequest.auction_price ?? 20;

            const effectiveTarget =
                typeof target !== "undefined"
                    ? target
                    : existingRequest.target ?? 0;

            const totalUsed = Number(effectiveAuctionPrice) * Number(effectiveTarget);

            // Chọn user cần kiểm tra điểm
            let chargeUser: IUser = user;

            if (isAdmin) {
                // Admin update: trừ điểm của user chủ request
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

            // Kiểm tra điểm
            const checkPoints = await checkUserPoints(fastify, chargeUser, totalUsed);

            if (!checkPoints.isEnough) {
                return reply.status(401).send({
                    message: `${translations[dataLanguage].services.needMorePointsFirst} ${checkPoints.neededPoints} ${translations[dataLanguage].services.needMorePointsSecond}`,
                    success: false,
                });
            }
        }

        if (updateData.data && typeof updateData.data === "object") {
            updateData.data = JSON.stringify(updateData.data);
        }

        // ✅ Kiểm tra xem có thay đổi gì không
        const hasChanges = Object.keys(updateData).some((key) => {
            if (key === "data") {
                // So sánh JSON string
                return (
                    JSON.stringify(updateData[key]) !==
                    JSON.stringify(existingRequest[key])
                );
            }
            return updateData[key] !== existingRequest[key];
        });

        if (!hasChanges) {
            return reply.status(200).send({
                message: "No changes detected",
                success: true,
            });
        }

        if (typeof updateData.data === "object") {
            updateData.data = JSON.stringify(updateData.data);
        }

        // ✅ CÂU LỆNH UPDATE VÀO DATABASE
        await fastify.prisma.blog20Request.update({
            where: { id },
            data: {
                ...updateData,
                name,
                updatedAt: new Date(),
            },
        });

        return reply.status(200).send({
            success: true,
            message: "Blog request updated successfully",
        });
    } catch (error) {
        console.log(error);
        handleErrorResponse(reply, error);
    }
};