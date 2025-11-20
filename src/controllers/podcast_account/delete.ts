import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
dotenv.config();

// xoá mềm
export const softDeletePodcastAccount = async (
    fastify: FastifyInstance,
    request: FastifyRequest<{ Body: { ids: string[] } }>,
    reply: FastifyReply
) => {
    try {
        const { ids } = request.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return reply.status(400).send({
                message: "Invalid request: No IDs provided.",
                success: false,
            });
        }

        // Xóa nhiều bản ghi cùng lúc
        const data = await fastify.prisma.podcastAccount.updateMany({
            where: {
                id: { in: ids },
                deletedAt: null, // Chỉ xóa nếu chưa bị xóa trước đó
            },
            data: { deletedAt: new Date() },
        });

        // Kiểm tra nếu không có bản ghi nào được cập nhật
        if (data.count === 0) {
            return reply.status(404).send({
                message: "The data does not exist or has been deleted! Please try again after verifying the information.",
                success: false,
                count: data.count
            });
        }

        return reply.status(200).send({
            message: "Podcast account deleted successfully.",
            success: true,
            count: data.count
        });
    } catch (error: any) {
        handleErrorResponse(reply, error);
    }
};
