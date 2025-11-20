import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { v7 as uuidv7 } from "uuid";
import { createSocialGroupSchema } from "../../schema/social_group";

export const createSocialGroup = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { id: userId } = request.user as { id: string, role: string };

    const parsed = createSocialGroupSchema.safeParse(request.body);

    if (!parsed.success) {
      const errors = parsed.error.errors.map((err) => err.message).join(", ");
      return reply.status(400).send({ message: errors, success: false });
    }

    const name = parsed.data.name.trim();

    const existingGroup:any = await fastify.prisma.socialGroup.findFirst({
      where: {
        userId,
        name,
      },
    });

    if (existingGroup) {
      // Nếu là "Default", trả về luôn group thay vì báo lỗi
      if (existingGroup.name === "Default") {
        return reply.status(200).send({
          success: true,
        });
      }

      return reply.status(400).send({
        message: "The group name already exists. Please try again with a different name.",
        success: false,
      });
    }

    // Tạo mới
    const newGroup = await fastify.prisma.socialGroup.create({
      data: {
        id: uuidv7(),
        userId,
        name,
      },
    });

    return reply.status(201).send({
      message: "Data created successfully",
      success: true,
      socialGroup: newGroup,
    });
  } catch (error) {
    console.error("Create social group error:", error);
    handleErrorResponse(reply, error);
  }
};
