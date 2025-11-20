import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";

export const updateDepositStatusDashboard = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const {status} = request.body;
    const {id:userId, role} = request.user as { id: string, role: string } ;
    const isAdmin = role === "admin";

    // Tìm entity trước
    const deposit = await fastify.prisma.deposit.findFirst({
      where: !isAdmin ? { id, userId , deletedAt: null } : { id, deletedAt: null },
      select: {
        id: true,
        updatedAt: true
      }
    });

    if (!deposit) {
      return reply.status(404).send({
        message: "Deposit not found or already deleted.",
        success: false,
      });
    }

    // Cập nhật status
    await fastify.prisma.deposit.update({
      where: { id },
      data: { status, updatedAt: deposit.updatedAt },
      select: {
        id: true,
      }
    });

    return reply.status(200).send({
      message: `Status updated to ${status} successfully.`,
      success: true,
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};
