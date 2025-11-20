import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { v7 as uuidv7 } from "uuid";
import { ImageableType, ImageType } from "@prisma/client";
import { downloadImageWithRetry, uploadImageWithRetry } from "../../utils/minio";

export const runMoreEntityRequest = async (
    fastify: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        const { id } = request.body as any;
        const { id: userId, role } = request.user as { id: string; role: string };
        const isAdmin =
            (role === "admin") ||
            (role === "dev");
        const [siteNormalRes, siteCaptchaRes] = await Promise.all([
            fetch("https://demo.likepion.com/entitynormal.txt"),
            fetch("https://demo.likepion.com/entitycaptcha.txt")
        ]);
        const normalList = (await siteNormalRes.text()).split("\n").map(x => x.trim()).filter(Boolean);
        const captchaList = (await siteCaptchaRes.text()).split("\n").map(x => x.trim()).filter(Boolean);

        const oldRequest = await fastify.prisma.entityRequest.findUnique({
            where: !isAdmin ? { id: id, userId } : { id: id },
            include: {
                entityLinks: {
                    where: { link_profile: { not: "" } },
                    select: { link_profile: true, site: true }
                }
            }
        });

        if (!oldRequest) {
            return reply
                .status(404)
                .send({ message: "Request not found", success: false });
        }

        // 💡 Check số lần đã chạy cho website này:
        const website = oldRequest.website;
        const websiteRequestCount = await fastify.prisma.entityRequest.count({
            where: {
                website: website.trim(),
                deletedAt: null
            },
        });

        if (websiteRequestCount >= 2) {
            return reply.status(400).send({
                success: false,
                message: `Website ${website} đã chạy quá 2 lần, không thể duplicate thêm.`,
            });
        }

        // Lấy danh sách site đã có
        const existingSites = oldRequest.entityLinks.map(link => link.site);

        // Lọc bỏ những site đã tồn tại
        const allTxtDomains = [...new Set([...normalList, ...captchaList])]
            .filter(domain => !existingSites.includes(domain));

        const fixedSitesString = allTxtDomains.join(";");

        const { entityLinks, ...cleanOldRequest }: any = oldRequest;

        // Tạo dữ liệu mới dựa trên request cũ
        const newEntityRequest = await fastify.prisma.entityRequest.create({
            data: {
                ...cleanOldRequest,
                id_tool: "",
                entity_limit: allTxtDomains.length,
                id: uuidv7(), // Cập nhật ID mới
                fixed_sites: fixedSitesString,
                createdAt: new Date(), // Cập nhật thời gian tạo mới
                updatedAt: new Date(), // Cập nhật thời gian cập nhật mới
                status: "draft",
                account_type: "multiple",
                run_count: 0
            },
        });

        // Lấy tất cả ảnh cũ từ DB
        const oldImages = await fastify.prisma.images.findMany({
            where: {
                imageableType: "entity" as ImageableType,
                imageableId: oldRequest.id,
            },
            select: {
                id: true,
                publicId: true,
                type: true,
                imageableType: true,
                imageableId: true,
                url: true,
            }
        });

        // 4. Copy ảnh bằng cách download và upload lại
        const duplicatedImages = [];
        for (const image of oldImages) {
            try {
                const fileExtension = image.publicId.split('.').pop() || 'png';
                const newFileName = `lip/${uuidv7()}.${fileExtension}`;
                const newUploadUrl = `${process.env.UPLOAD_API}/${newFileName}`;

                // Download với retry
                const imageGetResponse = await downloadImageWithRetry(image.url);
                const imageBuffer = imageGetResponse.data;
                const contentType = imageGetResponse.headers['content-type'] || 'image/png';

                // Upload với retry
                await uploadImageWithRetry(newUploadUrl, imageBuffer, contentType);

                duplicatedImages.push({
                    id: uuidv7(),
                    publicId: newFileName,
                    url: `${newUploadUrl}`,
                    imageableId: newEntityRequest.id,
                    imageableType: "entity" as ImageableType,
                    type: image.type as ImageType,
                    userId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            } catch (error) {
                console.error(`Failed to copy image ${image.url} after 7 retries:`, error);
                // Skip ảnh này và tiếp tục với ảnh khác
            }
        }

        if (duplicatedImages.length > 0) {
            await fastify.prisma.images.createMany({
                data: duplicatedImages,
            });
        }

        return reply.status(201).send({
            success: true,
            message: "Duplicate request created successfully",
            entity_requests: newEntityRequest,
        });
    } catch (error) {
        console.log(error);
        handleErrorResponse(reply, error);
    }
};