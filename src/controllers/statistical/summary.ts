import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import dotenv from "dotenv";
import { calculateTotalPoints } from "../../utils/calculateTotalPoints";
import { DateTime } from "luxon";

dotenv.config();

export const getSummaryStatistics = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const { range = "all" } = request.query;

    // Xác định thời gian lọc
    let startDate: Date | undefined;
    let endDate: Date = new Date();

    const now = DateTime.now();

    switch (range) {
      case "this_month":
        startDate = now.startOf("month").toJSDate();
        break;
      case "last_month":
        startDate = now.minus({ months: 1 }).startOf("month").toJSDate();
        endDate = now.minus({ months: 1 }).endOf("month").toJSDate();
        break;
      case "last_3_months":
        startDate = now.minus({ months: 3 }).startOf("month").toJSDate();
        break;
      case "last_6_months":
        startDate = now.minus({ months: 6 }).startOf("month").toJSDate();
        break;
      case "all":
      default:
        startDate = undefined;
        endDate = new Date();
        break;
    }

    const createdAtFilter = startDate
      ? { createdAt: { gte: startDate, lte: endDate } }
      : {};

    // Chạy song song các truy vấn
    const [
      allTransactions,
      totalUserCount,
      completedDeposits,
      entityRequestCount,
      googleStackingCount,
      indexLinkCount,
    ] = await Promise.all([
      fastify.prisma.transaction.findMany({
        where: {
          deletedAt: null,
          user: { profile: { role: "user" } },
          ...createdAtFilter,
        },
        select: { points: true, type: true },
      }),

      fastify.prisma.user.count({
        where: {
          deletedAt: null,
          profile: { role: "user" },
          ...createdAtFilter,
        },
      }),

      fastify.prisma.deposit.findMany({
        where: {
          deletedAt: null,
          status: "completed",
          ...createdAtFilter,
        },
        select: {
          money_vnd: true,
        },
      }),

      fastify.prisma.entityLink.count({
        where: {
          deletedAt: null,
          ...createdAtFilter,
        },
      }),

      fastify.prisma.googleStackingLink.count({
        where: {
          deletedAt: null,
          ...createdAtFilter,
        },
      }),

      fastify.prisma.indexLink.count({
        where: {
          deletedAt: null,
          ...createdAtFilter,
        },
      }),
    ]);

    // Tính tổng tiền VND từ deposit
    const totalRevenueVND = completedDeposits.reduce((sum: any, deposit: any) => {
      return sum + (deposit.money_vnd ? Number(deposit.money_vnd) : 0);
    }, 0);

    // Tính tổng điểm
    const totalPoints = calculateTotalPoints(allTransactions);

    return reply.status(200).send({
      success: true,
      statisticals: {
        ...totalPoints,
        totalUser: totalUserCount,
        totalRevenueVND,
        entityRequest: entityRequestCount,
        googleStackingRequest: googleStackingCount,
        indexLink: indexLinkCount,
      },
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
