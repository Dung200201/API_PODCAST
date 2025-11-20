import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { IUser } from "../../types/user";
import { z } from "zod";

const blog20AccountSchema = z.object({
    website: z.string().optional(),
    username: z.string().optional(),
    email: z.string().email().optional(),
    password: z.string().optional(),
    twoFA: z.string().optional(),
    quickLink: z.string().optional(),
    homeLink: z.string().optional(),
    cookies: z.string().optional(),
    status: z.enum(["new", "running", "completed", "failed", "die", "cancel"]).optional(),
    note: z.string().optional(),
});

// ===================== UPDATE 1 ACCOUNT =====================
export const updateBlog20Account = async (
    fastify: FastifyInstance,
    request: FastifyRequest<{ Params: { id: string }; Body: any }>,
    reply: FastifyReply
) => {
    try {
        const { id } = request.params;
        const formData = request.body as Record<string, any>;
        const updateData = { ...formData };

        const user = request.user as IUser;
        const { id: userId, role } = user;
        const isAdmin = role === "admin" || role === "dev";

        //Lấy dữ liệu hiện tại
        const existingAccount = await fastify.prisma.blog20Account.findFirst({
            where: !isAdmin
                ? { id, deletedAt: null, id_tool: userId }
                : { id, deletedAt: null },
        });

        if (!existingAccount) {
            return reply.status(404).send({ success: false, message: "Blog20Account not found" });
        }

        // Check body rỗng
        if (Object.keys(updateData).length === 0) {
            return reply.status(400).send({ success: false, message: "No data provided for update" });
        }

        // Validate dữ liệu
        const validation = blog20AccountSchema.safeParse(updateData);
        if (!validation.success) {
            const allErrors = validation.error.errors.map(e => e.message).join(", ");
            return reply.status(400).send({ success: false, message: allErrors });
        }

        // Kiểm tra có thay đổi thực sự không
        const keys = Object.keys(updateData) as (keyof typeof existingAccount)[];
        const hasChanges = keys.some(key => updateData[key] !== existingAccount[key]);
        if (!hasChanges) {
            return reply.status(200).send({ success: true, message: "No changes detected" });
        }

        // Thực hiện cập nhật
        const updated = await fastify.prisma.blog20Account.update({
            where: { id },
            data: { ...updateData, updatedAt: new Date() },
        });

        return reply.status(200).send({
            success: true,
            message: "Blog20Account updated successfully",
            blog20Account: updated,
        });
    } catch (error) {
        console.error(error);
        handleErrorResponse(reply, error);
    }
};

// ===================== BULK UPDATE =====================
export const bulkUpdateBlog20Accounts = async (
    fastify: FastifyInstance,
    request: FastifyRequest<{ 
        Body: { 
            blogGroupId: string; 
            status?: string; 
            id_tool?: string; 
            where_status?: string; 
            where_id_tool?: string; 
        } 
    }>,
    reply: FastifyReply
) => {
    try {
        const { blogGroupId, status, id_tool, where_status, where_id_tool } = request.body;

        if (!where_status && !where_id_tool) {
            return reply.status(400).send({
                success: false,
                message: "At least one condition (where_status or where_id_tool) is required",
            });
        }

        // Lấy danh sách các bản ghi sẽ bị ảnh hưởng
        const accounts = await fastify.prisma.blog20Account.findMany({
            where: {
                blogGroupId,
                status: where_status || undefined,
                id_tool: where_id_tool || undefined,
                deletedAt: null,
            },
            select: { id: true },
        });

        if (!accounts || accounts.length === 0) {
            return reply.status(400).send({
                success: false,
                message: "No Blog20Account found to update",
            });
        }

        // Cập nhật hàng loạt
        const updatedRecords = await fastify.prisma.blog20Account.updateMany({
            where: {
                blogGroupId,
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
