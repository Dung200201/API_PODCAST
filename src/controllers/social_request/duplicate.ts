import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { v7 as uuidv7 } from 'uuid';

function getRandomSuffix() {
  return Math.random().toString(36).substring(2, 6).toUpperCase(); // VD: 'A9X1'
}

export const duplicateSocialRequest = async (
    fastify: FastifyInstance,
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
) => {
    try {
        const { id } = request.params;
        const { id: userId, role } = request.user as { id: string, role: string };
        const isAdmin = role === "admin";
        
        // 📌 Lấy dữ liệu cũ
        const oldRequest = await fastify.prisma.socialRequest.findUnique({
            where: !isAdmin ? { id, userId, deletedAt: null } : { id, deletedAt: null },
        });

        if (!oldRequest) {
            return reply.status(404).send({ message: "Request not found", success: false });
        }

        // ✅ Tạo bản ghi mới
        const newRequestId = uuidv7();
        const newSocial = await fastify.prisma.socialRequest.create({
            data: {
                ...oldRequest,
                name:`${oldRequest.name}-${getRandomSuffix()}` ,
                id: newRequestId,
                createdAt: new Date(),
                updatedAt: new Date(),
                status: "new"
            },
        });

        // ✅ Lấy tất cả socialLink liên quan tới request cũ
        const oldLinks = await fastify.prisma.socialLink.findMany({
            where: { socialRequestId: oldRequest.id },
        });

        // ✅ Duplicate từng link sang socialRequestId mới
        if (oldLinks.length > 0) {
            const duplicatedLinks = oldLinks.map(link => ({
                ...link,
                id: uuidv7(), // ID mới
                socialRequestId: newRequestId, // Liên kết với request mới
                createdAt: new Date(),
                updatedAt: new Date(),
            }));

            // 🌀 Tạo đồng loạt
            await fastify.prisma.socialLink.createMany({
                data: duplicatedLinks,
                skipDuplicates: true,
            });
        }

        return reply.status(201).send({
            success: true,
            message: "Duplicate request and related links created successfully",
            socialRequest: newSocial,
        });
    } catch (error) {
        console.log(error);
        handleErrorResponse(reply, error);
    }
};
