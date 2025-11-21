import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { IUser } from "../../types/user";
import { z } from "zod";
import _ from "lodash";

const updateSchema = z.object({
    name: z.string().optional(),
    target: z.number().int().min(0).max(1000).optional(),
    auction_price: z.number().int().min(1).max(255).optional(),
    data: z.any().optional(),
    status: z.enum(["draft", "new", "pending", "running", "completed", "cancel"]).optional(),
    id_tool: z.string().optional(),
    podcastGroupId: z.string().optional()
});

const mainSchema = z.object({
    register: updateSchema.extend({ id: z.string() }),
    post: updateSchema.optional(),
});

export const updateRegisterAndPost = async (
    fastify: FastifyInstance,
    request: FastifyRequest<{ Body: any }>,
    reply: FastifyReply
) => {
    try {
        const user = request.user as IUser;
        const { role, type } = user;
        const isAdmin = ["admin", "dev"].includes(role) || type === "priority";

        // Parse JSON trước nếu body là string
        let bodyData: any = request.body;

        if (!bodyData || typeof bodyData !== "object") {
            try {
                bodyData = JSON.parse(bodyData);
            } catch {
                return reply.status(400).send({
                    success: false,
                    message: "Invalid JSON body"
                });
            }
        }

        // Validate body SAU KHI đã parse
        const validate = mainSchema.safeParse(bodyData);
        if (!validate.success) {
            return reply.status(400).send({
                success: false,
                message: validate.error.errors.map((e) => e.message).join(", ")
            });
        }

        const { register, post } = validate.data;

        // -------------------------
        // Lấy bản ghi register gốc
        // -------------------------
        const existingRegister = await fastify.prisma.podcastRequest.findUnique({
            where: isAdmin
                ? { id: register.id, deletedAt: null }
                : { id: register.id, userId: user.id, deletedAt: null }
        });

        if (!existingRegister) {
            return reply.status(404).send({ success: false, message: "Register request not found" });
        }

        if (existingRegister.typeRequest !== "register") {
            return reply.status(400).send({
                success: false,
                message: "This record is not type register"
            });
        }

        // -----------------------------
        // Tìm bản ghi post cùng group
        // -----------------------------
        const existingPost = await fastify.prisma.podcastRequest.findFirst({
            where: {
                podcastGroupId: existingRegister.podcastGroupId,
                typeRequest: "post",
                deletedAt: null
            }
        });

        // ------------------------------------------------------
        // FUNCTION phụ xử lý update (so sánh đổi + stringify data)
        // ------------------------------------------------------
        const buildUpdateData = (oldData: any, newData: any) => {
            const updateObj: any = {};

            for (const key of Object.keys(newData)) {
                if (key === "data") {
                    const newParsed = typeof newData.data === "string"
                        ? (() => { try { return JSON.parse(newData.data) } catch { return newData.data } })()
                        : newData.data;

                    const oldParsed = (() => {
                        try { return JSON.parse(oldData.data) } catch { return oldData.data }
                    })();

                    if (!_.isEqual(newParsed, oldParsed)) {
                        updateObj.data = typeof newData.data === "string"
                            ? newData.data
                            : JSON.stringify(newData.data);
                    }
                    continue;
                }

                if (newData[key] !== undefined && newData[key] !== oldData[key]) {
                    updateObj[key] = newData[key];
                }
            }

            return updateObj;
        };

        // -------------------------
        // 1) Update register
        // -------------------------
        const registerUpdateData = buildUpdateData(existingRegister, register);

        let updatedRegister = existingRegister;
        if (Object.keys(registerUpdateData).length > 0) {
            updatedRegister = await fastify.prisma.podcastRequest.update({
                where: { id: existingRegister.id },
                data: registerUpdateData
            });
        }

        // -------------------------
        // 2) Update post nếu có gửi
        // -------------------------
        let updatedPost = null;

        if (post && existingPost) {
            const postUpdateData = buildUpdateData(existingPost, post);

            if (Object.keys(postUpdateData).length > 0) {
                updatedPost = await fastify.prisma.podcastRequest.update({
                    where: { id: existingPost.id },
                    data: postUpdateData
                });
            }
        }

        return reply.status(200).send({
            success: true,
            message: "Update register/post successfully",
            register: updatedRegister,
            post: updatedPost
        });

    } catch (error) {
        console.error("=== ERROR updateRegisterAndPost ===", error);
        handleErrorResponse(reply, error);
    }
};