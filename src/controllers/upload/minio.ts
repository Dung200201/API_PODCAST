import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import axios from "axios";
import { v7 as uuidv7 } from "uuid";
import sharp from 'sharp';
import dotenv from "dotenv";
dotenv.config()

const api = process.env.UPLOAD_API;

export const uploadImageMinio = async (
    fastify: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
) => {
    try {
        const body: any = await request.body;
        let { imageableId, imageableType, type, file } = body;
        let shouldTryUpdate = imageableId && imageableType && type;
        if (type?.value === "avatar" || type?.value === "cover") {
            type = type.value;
            imageableType = imageableType.value;
            imageableId = imageableId.value;
        }
        const { id: userId } = request.user as { id: string };

        if (!file || typeof file.toBuffer !== "function") {
            return reply.status(400).send({ error: "No valid file uploaded" });
        }
        const originalBuffer = await file.toBuffer();
        const pngBuffer = await sharp(originalBuffer)
            .png({ quality: 80 }) // Bạn có thể tùy chỉnh chất lượng ảnh PNG
            .toBuffer();
        const fileName = `lip/${uuidv7()}.png`;
        // Tạo tên file
        const url = `${api}/${fileName}`;

        // TH1 & TH3: có đầy đủ thông tin liên kết
        if (shouldTryUpdate) {
            const existingImage = await fastify.prisma.images.findFirst({
                where: { imageableId, imageableType, type },
                select: {
                    id: true,
                    publicId: true,
                    url: true,
                    imageableId: true,
                    imageableType: true
                }
            });

            if (existingImage) {

                await Promise.allSettled([
                    await axios.delete(existingImage.url),
                    await axios.put(url, pngBuffer, {
                        headers: {
                            "Content-Type": "image/png", // ví dụ image/png
                            "Content-Length": pngBuffer.length,
                        },
                    })
                ]);
                const fileName = `lip/${uuidv7()}.png`;

                await fastify.prisma.images.update({
                    where: { id: existingImage.id },
                    data: {
                        publicId: fileName,
                        url,
                        updatedAt: new Date(),
                    },
                });
            } else {
                await axios.put(url, pngBuffer, {
                    headers: {
                        "Content-Type": "image/png", // ví dụ image/png
                        "Content-Length": pngBuffer.length,
                    },
                })
                // 👉 TH1 hoặc TH3: luôn tạo mới
                await fastify.prisma.images.create({
                    data: {
                        id: uuidv7(),
                        publicId: fileName,
                        url,
                        type,
                        userId,
                        imageableId,
                        imageableType,
                    },
                });
            }

        } else {
            await axios.put(url, pngBuffer, {
                headers: {
                    "Content-Type": "image/png", // ví dụ image/png
                    "Content-Length": pngBuffer.length,
                },
            });
            // 👉 TH2: không có thông tin liên kết → add mới
            await fastify.prisma.images.create({
                data: {
                    id: uuidv7(),
                    publicId: fileName,
                    url,
                    type,
                    userId,
                    imageableId: null,
                    imageableType: null,
                },
            });
        }

        return reply.send({
            success: true,
            publicId: fileName,
            url: url,
        });
    } catch (error) {
        console.log("error", error);

        handleErrorResponse(reply, error);
    }
};

export const deleteImageMinio = async (
    fastify: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        const { fileName }: any = request.body;

        if (!fileName) {
            return reply.status(400).send({ error: "Image not found" });
        }
        const url = api + "/lip/" + fileName.value

        const publicId = "/lip/" + fileName.value

        await Promise.allSettled([
            await axios.delete(url),
            fastify.prisma.images.delete({ where: { publicId: publicId } }), // Xoá DB
        ]);

        return reply.status(200).send({
            success: true,
        });
    } catch (error) {
        handleErrorResponse(reply, error);
    }
};

// export const updateImageMinio = async (
//     fastify: FastifyInstance,
//     request: FastifyRequest,
//     reply: FastifyReply
// ) => {
//     try {
//         const { fileName }: any = request.body;

//         if (!fileName) {
//             return reply.status(400).send({ error: "Image not found" });
//         }

//         const publicId = "/lip/" + fileName.value

//         const checkImage = await fastify.prisma.images.findFirst({
//             where: {
//                 publicId: publicId
//             }
//         })

//         if (checkImage) {
//             await Promise.allSettled([
//                 fastify.prisma.images.delete({ where: { publicId: fileName } }), // Xoá DB
//             ]);
//         }

//         return reply.status(200).send({
//             success: true,
//         });
//     } catch (error) {
//         handleErrorResponse(reply, error);
//     }
// };

