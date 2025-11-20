import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
import { IUser } from "../../types/user";
import { entityLinkSchema } from "../../schema/entity_link";
dotenv.config();

export const updateEntityLink = async (
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
    const isAdmin =
      (role === "admin") ||
      (role === "dev");

    // Lấy dữ liệu hiện tại
    const existingLink: any = await fastify.prisma.entityLink.findFirst({
      where: !isAdmin ? { id, deletedAt: null, id_tool: userId } : { id, deletedAt: null },
    });

    if (!existingLink) {
      return reply.status(404).send({ message: "Entity link not found", success: false });
    }

    if (Object.keys(updateData).length === 0) {
      return reply.status(400).send({ message: "No data provided for update", success: false });
    }

    // ✅ Validate dữ liệu đầu vào
    const validation = entityLinkSchema.safeParse(updateData);
    if (!validation.success) {
      const allErrors = validation.error.errors.map((err) => err.message).join(", ");
      return reply.status(400).send({ message: allErrors, success: false });
    }

    // Sanitize nếu có
    if (updateData.about) {
      updateData.about = fastify.sanitize(updateData.about);
    }

    // So sánh thay đổi
    const hasChanges = Object.keys(updateData).some(
      (key) => updateData[key] !== existingLink[key]
    );

    if (!hasChanges) {
      return reply.status(200).send({ message: "No changes detected", success: true });
    }

    // ✅ Cập nhật
    const updated = await fastify.prisma.entityLink.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    return reply.status(200).send({
      success: true,
      message: "Entity link updated successfully",
      entity_link: updated,
    });
  } catch (error) {
    console.error(error);
    handleErrorResponse(reply, error);
  }
};

export const bulkUpdateEntityLinks = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: { ids: string[]; data: any } }>,
  reply: FastifyReply
) => {
  try {
    const { status, id_tool, where_status, where_id_tool, entityRequestId } = request.body as any;

    if (!where_id_tool && !where_status) {
      return reply.status(400).send({
        success: false,
        message: "Điều kiện là bắt buộc nhập"
      });
    }
    const entityLinks = await fastify.prisma.entityLink.findMany({
      where: {
        entityRequestId,
        status: where_status || undefined,
        id_tool: where_id_tool || undefined,
        deletedAt: null,
      },
      select: {
        id: true
      },
    })

    if (!entityLinks || entityLinks?.length === 0) {
      return reply.status(400).send({
        success: false,
        message: "Không tìm thấy dữ liệu cần cập nhật! Vui lòng thử lại"
      });
    }

    const updatedRecords = await fastify.prisma.entityLink.updateMany({
      where: {
        // id: {
        //   in: [ids]
        // },
        entityRequestId,
        status: where_status || undefined,
        id_tool: where_id_tool || undefined,
        deletedAt: null,
      },
      data: {
        status,
        id_tool,
        updatedAt: new Date(),
      },
    });
    if (!updatedRecords || updatedRecords?.count === 0) {
      return reply.status(400).send({
        success: false,
        message: "Khong có dữ liệu nào được cập nhật"
      });
    }

    return reply.status(200).send({
      success: true,
      message: "Bulk update completed",
      count: updatedRecords.count,
      updatedRecords
    });
  } catch (error) {
    console.error(error);
    handleErrorResponse(reply, error);
  }
};
