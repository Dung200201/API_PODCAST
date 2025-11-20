import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { googleStackingRequestSchema } from "../../schema/google_stacking";
import { translations } from "../../lib/i18n";
import { v7 as uuidv7 } from "uuid";
import { ImageableType, ImageType, Role } from "@prisma/client";
import axios from "axios";
import { createUserActionLog } from "../../utils/userActionLog";
import { checkUserPoints } from "../../service/checkPoins";
import { IUser } from "../../types/user";

const stripBackslashInHTMLContent = (val?: string) => {
    if (typeof val !== "string") return val;

    // Bỏ tất cả \ ở đầu nội dung của các thẻ HTML (ví dụ: <p>\text</p> => <p>text</p>)
    return val.replace(/(<[^>]+>)\\+/g, '$1').trim();
};

export const continueGoogleStacking = async (
    fastify: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        const { id, count = 1 } = request.body as { id: string, count: number };
        const { id: userId, language, role } = request.user as { id: string; language: string; role: Role };
        const isAdmin = role === "admin" || role === "dev";
        const user = request.user as IUser

        const where: any = {
            id,
            deletedAt: null,
        };

        if (!isAdmin) {
            where.userId = userId;
        }

        const entity = await fastify.prisma.entityRequest.findFirst({
            where, select: {
                id: true,
                about: true,
                last_name: true,
                first_name: true,
                userId: true,
                website: true,
                phone: true,
                address: true,
                location: true,
                spin_content: true,
                entity_connect: true,
            }
        });

        let about;
        let title;

        if (entity) {
            const dataLanguage = language === "auto" ? "vi" : "en";

            if (entity?.first_name || entity?.last_name) {
                title = fastify.sanitize(`${entity.first_name ?? ""} ${entity.last_name ?? ""}`.trim());
            }

            // Lấy data từ bảng site add vào bảng gg stacking link
            const siteData = await fastify.prisma.site.findMany({
                where: {
                    type: "googleStacking",
                    status: "running"
                },
                select: {
                    domain: true
                }
            });

            if (siteData.length === 0) {
                return reply.status(400).send({
                    success: false,
                    message: "No site data found to create stacking links.",
                });
            }

            // 4. Check user points
            const basePoints = 30 * siteData.length;
            const totalUsed = basePoints * (count + 1);
            const checkPoints = await checkUserPoints(fastify, user, totalUsed);
            console.log("checkPoints", checkPoints);
            console.log("totalUsed", totalUsed);
            console.log("basePoints", basePoints);
            console.log("duplicate", count);
            
            if (checkPoints.isExpired) {
                return reply.status(401).send({
                    message: translations[dataLanguage].services.expiredPoints,
                    success: false,
                });
            }

            if (!checkPoints.isEnough) {
                return reply.status(401).send({
                    message: `${translations[dataLanguage].services.needMorePointsFirst} ${checkPoints.neededPoints} ${translations[dataLanguage].services.needMorePointsSecond}`,
                    success: false,
                });
            }

            const dataCheck = {
                ...entity,
                auction_price: 30,
                title,
                duplicate: count,
                folder_url: "",
                website: entity?.website,
                stacking_connect: entity?.entity_connect,
            }

            // 1. Validate input
            const checkValidate = googleStackingRequestSchema.safeParse(dataCheck);
            if (!checkValidate.success) {
                const allErrors = checkValidate.error.errors.map((err: any) => err.message).join(', ');
                return reply.status(400).send({ message: allErrors });
            }

            about = stripBackslashInHTMLContent(entity?.about);

            // 2. Sanitize input
            if (about) {
                about = fastify.sanitize(about);
            }

            const validatedData = checkValidate.data;

            // 5. Prepare data
            const dataReq: any = {
                ...validatedData,
                id: uuidv7(),
                userId: entity.userId,
                about,
                title,
                folder_url: "",
                createdAt: new Date(), // Cập nhật thời gian tạo mới
                updatedAt: new Date(), // Cập nhật thời gian cập nhật mới
                status: "draft",
            };

            // 6. Save to DB
            const newRequest = await fastify.prisma.googleStackingRequest.create({
                data: dataReq,
            });

            // Lấy tất cả ảnh cũ từ DB
            const oldImage = await fastify.prisma.images.findFirst({
                where: {
                    imageableType: "entity" as ImageableType,
                    type: "cover" as ImageType,
                    imageableId: entity.id,
                },
                select: {
                    publicId: true,
                    url: true,
                    type: true,
                    userId: true
                }
            });

            if (oldImage) {
                const fileExtension = oldImage.publicId.split('.').pop() || 'png';
                const newFileName = `lip/${uuidv7()}.${fileExtension}`;
                const newUploadUrl = `${process.env.UPLOAD_API}/${newFileName}`;

                const imageGetResponse = await axios.get(oldImage.url, {
                    responseType: 'arraybuffer'
                });

                const imageBuffer = imageGetResponse.data;
                const contentType = imageGetResponse.headers['content-type'] || 'image/png';

                await axios.put(newUploadUrl, imageBuffer, {
                    headers: {
                        "Content-Type": contentType,
                        "Content-Length": imageBuffer.length,
                    },
                });

                await fastify.prisma.images.create({
                    data: {
                        id: uuidv7(),
                        publicId: newFileName,
                        url: `${newUploadUrl}`,
                        imageableId: newRequest.id,
                        imageableType: "googleStacking" as ImageableType,
                        type: oldImage.type as ImageType,
                        userId: oldImage.userId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }
                });
            }

            await createUserActionLog({
                fastify,
                request,
                action: 'create',
                resource: 'google_stacking_request',
                resourceId: newRequest.id,
                metadata: {
                    title: newRequest.title,
                    website: newRequest.website,
                    auction_price: newRequest.auction_price,
                    duplicate: newRequest.duplicate
                },
            });

            // 7. Return response
            return reply.status(201).send({
                success: true,
                message: translations[dataLanguage].common.createSuccess,
                ggstacking_requests: newRequest,
            });
        }
    } catch (error) {
        console.log("error", error);

        handleErrorResponse(reply, error);
    }
};
