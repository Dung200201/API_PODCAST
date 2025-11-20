import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
import { IParams } from "../../types/generate";
import { SocialStatus } from "@prisma/client";
dotenv.config();

// Hàm cập nhật trạng thái
export const updateStatusSocialRequest = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: IParams; Body: { status: SocialStatus } }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params as { id: string };
    const { status } = request.body;
    const { id: userId, role } = request.user as { id: string; role: string };

    // Điều kiện admin
    const isAdmin = role === "admin" || role === "dev";

    // Kiểm tra xem giá trị status có hợp lệ không
    if (!Object.values(SocialStatus).includes(status as SocialStatus)) {
      return reply.status(400).send({
        message: "Invalid status value.",
        success: false,
      });
    }

    // Check xem social request có tồn tai k
    const existing = await fastify.prisma.socialRequest.findUnique({
      where: isAdmin
        ? { id, deletedAt: null }
        : { id, userId, deletedAt: null },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return reply.status(404).send({
        message: "The data does not exist or has been deleted! Please try again after verifying the information.",
        success: false,
      });
    }

    // Cập nhật trực tiếp status để tối ưu hiệu suất
    const updated = await fastify.prisma.socialRequest.update({
      where: { id },
      data: { status },
      select: { id: true, status: true, updatedAt: true },
    });

    // Trả về dữ liệu chi tiết indedx
    return reply.status(200).send({
      message: "Update successful!",
      success: true,
      data: updated,
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};