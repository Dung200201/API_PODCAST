import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
import { IndexRequestStatus } from "@prisma/client"; // ✅ Import đúng
import { IParams } from "../../types/generate";
dotenv.config();

export const updateStatusIndexRequest = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: IParams; Body: { status: IndexRequestStatus } }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params as { id: string };
    const { status } = request.body;
    const { id: userId, role } = request.user as { id: string; role: string };

    if (!Object.values(IndexRequestStatus).includes(status as IndexRequestStatus)) {
      return reply.status(400).send({
        message: "Invalid status value.",
        success: false,
      });
    }

    const isAdmin = role === "admin" || role === "dev";
    const existingIndex = await fastify.prisma.indexRequest.findUnique({
      where: isAdmin ? { id, deletedAt: null } : { id, userId, deletedAt: null },
      select: { id: true },
    });

    if (!existingIndex) {
      return reply.status(404).send({
        message: "Not found",
        success: false,
      });
    }

    // Cập nhật trực tiếp status để tối ưu hiệu suất
    const updatedIndex = await fastify.prisma.indexRequest.update({
      where: { id },
      data: { status },
      select: { id: true, status: true, updatedAt: true },
    });

    // Nếu không tìm thấy, trả về thông báo lỗi
    if (!updatedIndex) {
      return reply.status(404).send({
        message: "Update error",
        success: false,
      });
    }

    // Trả về dữ liệu chi tiết indedx
    return reply.status(200).send({
      success: true,
      data: updatedIndex,
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};