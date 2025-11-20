import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
dotenv.config();

// xoá mềm nhiều Blog20Group
export const softDeleteBlog20Group = async (
    fastify: FastifyInstance,
    request: FastifyRequest<{ Body: { ids: string[] } }>,
    reply: FastifyReply
) => {
    try {
        const { ids } = request.body;

        // Validate ids
        if (!Array.isArray(ids) || ids.length === 0) {
            return reply.status(400).send({
                message: "Invalid request: No IDs provided.",
                success: false,
            });
        }

        // Update nhiều bản ghi cùng lúc
        const data = await fastify.prisma.blog20Group.updateMany({
            where: {
                id: { in: ids },
                deletedAt: null, // Chỉ xoá nếu chưa xoá trước đó
            },
            data: { deletedAt: new Date() },
        });

        // Không có bản ghi nào được cập nhật
        if (data.count === 0) {
            return reply.status(404).send({
                message: "The data does not exist or has been deleted! Please try again after verifying the information.",
                success: false,
                count: data.count
            });
        }

        return reply.status(200).send({
            message: "The data has been deleted.",
            success: true,
            count: data.count
        });
    } catch (error: any) {
        handleErrorResponse(reply, error);
    }
};
