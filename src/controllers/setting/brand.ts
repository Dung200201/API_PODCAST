import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
dotenv.config();

export const getBrandSetting = async (
    fastify: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        // Truy vấn avatar và cover song song
        const [logo_light, logo_dark, favicon] = await Promise.all([
            fastify.prisma.images.findFirst({
                where: {
                    imageableType: 'setting',
                    type: 'logo_light',
                    deletedAt: null,
                },
                select: {
                    url: true,
                    publicId: true,
                },
                orderBy: { createdAt: 'desc' }, // ảnh mới nhất
            }),
            fastify.prisma.images.findFirst({
                where: {
                    imageableType: 'setting',
                    type: 'logo_dark',
                    deletedAt: null,
                },
                select: {
                    url: true,
                    publicId: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            fastify.prisma.images.findFirst({
                where: {
                    imageableType: 'setting',
                    type: 'favicon',
                    deletedAt: null,
                },
                select: {
                    url: true,
                    publicId: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
     
        // Trả về dữ liệu chi tiết indedx
        return reply.status(200).send({
            success: true,
            setting: {
                favicon,
                logo_light,
                logo_dark,
            },
        });
    } catch (error) {
        handleErrorResponse(reply, error);
    }
};
