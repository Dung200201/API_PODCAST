import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
import { socialRequestSchema } from "../../schema/social_request";
import { Locale, translations } from "../../lib/i18n";
import { checkUserPoints } from "../../service/checkPoins";
import { ISocialRequest } from "../../types/social_request";
dotenv.config();
import { v7 as uuidv7 } from "uuid";
import { IUser } from "../../types/user";

export const updateSocialRequest = async (
    fastify: FastifyInstance,
    request: FastifyRequest<{ Params: { id: string }; Body: any }>,
    reply: FastifyReply
) => {
    try {
        const { id } = request.params;
        const formData = request.body as Record<string, any>;
        const user = request.user as IUser;
        const { id: userId, language } = request.user as { id: string; role: string; language: Locale };

        // 📌 Lấy request hiện tại
        const existingRequest = await fastify.prisma.socialRequest.findUnique({
            where: { id, userId, deletedAt: null },
        });

        if (!existingRequest) {
            return reply.status(404).send({ message: "Data not found", success: false });
        }

        if (Object.keys(formData).length === 0) {
            return reply.status(400).send({ message: "No data provided for update", success: false });
        }

        // ✅ Validate
        const checkValidate = socialRequestSchema.safeParse({ ...formData, userId, id });
        if (!checkValidate.success) {
            const allErrors = checkValidate.error.errors.map((err) => err.message).join(", ");
            return reply.status(400).send({ message: allErrors });
        }

        const {
            auction_price,
            socialAccountIds,
            name,
            url_list,
            status,
            socialGroupId,
            percentage,
            unique_url,
            email_report,
            share_code,
        } = checkValidate.data as ISocialRequest;

        // 🔍 Kiểm tra thay đổi dữ liệu
        const existingData = existingRequest as { [key: string]: any };
        const changedKeys = [
            "name",
            "status",
            "percentage",
            "unique_url",
            "email_report",
            "share_code",
            "auction_price",
        ];
        const hasChanges = changedKeys.some((key) => formData[key] !== existingData[key]);

        if (!hasChanges) {
            return reply.status(200).send({
                message: "No change data successfully!",
                success: true,
                socialGroup: existingRequest,
            });
        }

        // Bước 1: Dựa vào danh sách đã có trong db socical link bắt đầu check với data khách gửi lên và những domain đẫ có trong social link để lọc ra data cần thêm
        const socialAccounts = await fastify.prisma.socialAccount.findMany({
            where: {
                socialGroupId,
                status: "live",
                deletedAt: null,
                id: {
                    in: socialAccountIds,
                },
            },
            select: {
                website: true,
                username: true,
                password: true,
                twoFA: true,
                cookies: true,
                email: true,
                id: true
            },
        });
        // Bước 1: lọc danh sách người dùng gửi lên mà trong link k có
        const currentLinks = await fastify.prisma.socialLink.findMany({
            where: { socialRequestId: existingRequest.id },
            select: { domain: true },
        });

        const existingDomainSet = new Set(currentLinks.map((item) => item.domain));
        const accountDomainSet = new Set(socialAccounts.map((item) => item.website));

        const domainsToDelete = [...existingDomainSet].filter((domain) => !accountDomainSet.has(domain));
        const accountsToAdd = socialAccounts.filter((acc) => !existingDomainSet.has(acc.website));

        if (domainsToDelete.length > 0) {
            await fastify.prisma.socialLink.deleteMany({
                where: {
                    socialRequestId: existingRequest.id,
                    domain: { in: domainsToDelete },
                },
            });
        }

        if (socialAccounts?.length > 0 || auction_price) {
            const totalUsed = auction_price * socialAccounts?.length;

            const checkPoints = await checkUserPoints(fastify, user, totalUsed);

            if (!checkPoints.isEnough) {
                return reply.status(401).send({
                    message: `${translations[language].services.needMorePointsFirst} ${checkPoints.neededPoints} ${translations[language].services.needMorePointsSecond}`,
                    success: false,
                });
            }
        }

        const now = new Date();
        const dataConfig = {
            data: url_list.map((item) => ({
                ...item,
                language: item.type === "AI" ? item.language : undefined,
                keyword: item.type === "AI" ? item.keyword : undefined,
                content: item.type !== "AI" ? item.content : undefined,
                title: item.type !== "AI" ? item.title : undefined,
            })),
            percentage,
            unique_url,
            email_report,
            share_code,
            auction_price,
        };


        const updatedRequest = await fastify.prisma.socialRequest.update({
            where: { id },
            data: {
                name,
                data: JSON.stringify(dataConfig),
                socialGroupId,
                status,
                updatedAt: now,
            },
        });

        if (accountsToAdd.length > 0) {
            const newLinks = accountsToAdd.map((account) => ({
                id: uuidv7(),
                socialRequestId: existingRequest.id,
                domain: account.website,
                dataSocialAccount: JSON.stringify({
                    id: account.id,
                    email: account.email,
                    username: account.username,
                    password: account.password,
                    twoFA: account.twoFA,
                    cookies: account.cookies,
                }),
            }));

            await fastify.prisma.socialLink.createMany({ data: newLinks });
        }

        return reply.status(200).send({
            success: true,
            message: "Request updated successfully",
            socialRequest: updatedRequest,
        });
    } catch (error) {
        console.log(error);
        handleErrorResponse(reply, error);
    }
};