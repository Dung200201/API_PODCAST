import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { IUser } from "../../types/user";
import { z } from "zod";

// Validate input
const blog20LinkSchema = z.object({
    domain: z.string().optional(),
    link_post: z.string().url().optional(),
    status: z.enum(["new", "running", "completed", "failed", "die", "cancel"]).optional(),
    note: z.string().optional(),
});

export const updateBlog20Link = async (
    fastify: FastifyInstance,
    request: FastifyRequest<{ Params: { id: string }; Body: any }>,
    reply: FastifyReply
) => {
    try {
        const { id } = request.params;
        const formData = request.body as Record<string, any>;
        const { ...updateData } = formData;

        const user = request.user as IUser;
        const { id: userId, role } = user;
        const isAdmin = role === "admin" || role === "dev";

        // Lấy dữ liệu hiện tại
        const existingLink = await fastify.prisma.blog20Link.findFirst({
            where: !isAdmin ? { id, deletedAt: null, id_tool: userId } : { id, deletedAt: null },
        });

        if (!existingLink) {
            return reply.status(404).send({ message: "Blog20Link not found", success: false });
        }

        if (Object.keys(updateData).length === 0) {
            return reply.status(400).send({ message: "No data provided for update", success: false });
        }

        // Validate dữ liệu
        const validation = blog20LinkSchema.safeParse(updateData);
        if (!validation.success) {
            const allErrors = validation.error.errors.map(err => err.message).join(", ");
            return reply.status(400).send({ message: allErrors, success: false });
        }

        // So sánh thay đổi
        const keys = Object.keys(updateData) as (keyof typeof existingLink)[];
        const hasChanges = keys.some(key => updateData[key] !== existingLink[key]);
        if (!hasChanges) {
            return reply.status(200).send({ message: "No changes detected", success: true });
        }

        // Update
        const updated = await fastify.prisma.blog20Link.update({
            where: { id },
            data: { ...updateData, updatedAt: new Date() },
        });

        return reply.status(200).send({
            success: true,
            message: "Blog20Link updated successfully",
            blog20Link: updated,
        });
    } catch (error) {
        console.error(error);
        handleErrorResponse(reply, error);
    }
};

export const bulkUpdateBlog20Links = async (
    fastify: FastifyInstance,
    request: FastifyRequest<{ Body: { blogRequestId: string; status?: string; id_tool?: string; where_status?: string; where_id_tool?: string } }>,
    reply: FastifyReply
) => {
    try {
        const { blogRequestId, status, id_tool, where_status, where_id_tool } = request.body;

        if (!where_status && !where_id_tool) {
            return reply.status(400).send({
                success: false,
                message: "At least one condition (where_status or where_id_tool) is required"
            });
        }

        const blogLinks = await fastify.prisma.blog20Link.findMany({
            where: {
                blogRequestId,
                status: where_status || undefined,
                id_tool: where_id_tool || undefined,
                deletedAt: null,
            },
            select: { id: true },
        });

        if (!blogLinks || blogLinks.length === 0) {
            return reply.status(400).send({
                success: false,
                message: "No Blog20Link found to update",
            });
        }

        const updatedRecords = await fastify.prisma.blog20Link.updateMany({
            where: {
                blogRequestId,
                status: where_status || undefined,
                id_tool: where_id_tool || undefined,
                deletedAt: null,
            },
            data: { status, id_tool, updatedAt: new Date() },
        });

        return reply.status(200).send({
            success: true,
            message: "Bulk update completed",
            count: updatedRecords.count,
        });

    } catch (error) {
        console.error(error);
        handleErrorResponse(reply, error);
    }
};
