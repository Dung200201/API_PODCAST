import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import dotenv from "dotenv";
import { calculateTotalPoints } from "../../utils/calculateTotalPoints";
dotenv.config();

export const getUserTransactionPoints = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const  {id:userId} = request.user as { id: string, role: string };

    const allTransactions = await fastify.prisma.transaction.findMany({
        where: { userId: userId, deletedAt: null },
        select: { points: true, type: true }, // Chỉ lấy các trường cần thiết: points và type
    });

    const totalPoints = calculateTotalPoints(allTransactions);

    return reply.status(200).send({
      success: true,
      statisticals:totalPoints
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};