import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { handleErrorResponse } from "../../utils/handleError";

interface RevenueByDay {
  range?: string;
  _total_customer?: string;
  _total_points?: string;
  _total_points_used?: string;
  _remaining_points?: string;
  _total_revenue?: string;
  _entity_links?: string;
  _google_stacking_link?: string;
  _index_link?: string;
}

export const getRevenueByDay = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Querystring: RevenueByDay }>,
  reply: FastifyReply
) => {
  try {
    const {
      range = "this_week",
      _total_customer,
      _total_points,
      _total_points_used,
      _total_revenue,
      _entity_links,
      _google_stacking_link,
      _index_link,
    } = request.query;

    const now = DateTime.now();
    const startDate = range === "last_week"
      ? now.minus({ weeks: 1 }).startOf("week")
      : now.startOf("week");

    const endDate = range === "last_week"
      ? now.minus({ weeks: 1 }).endOf("week")
      : now.endOf("week");

    const result: Record<string, { [lable: string]: number }> = {};

    // Khởi tạo từ ngày thứ 2 đến cn
    for (let i = 0; i < 7; i++) {
      const date = startDate.plus({ days: i });
      const key = date.toFormat("ccc dd/MM");
      result[key] = {}
    }

    // 1. Tổng doanh thu
    if (_total_revenue) {

      const deposits = await fastify.prisma.deposit.findMany({
        where: {
          deletedAt: null,
          status: "completed",
          createdAt: {
            gte: startDate.toJSDate(),
            lte: endDate.toJSDate(),
          },
        },
        select: {
          createdAt: true,
          money_vnd: true,
        },
      });

      for (const d of deposits) {
        const key = DateTime.fromJSDate(d.createdAt).toFormat("ccc dd/MM");
        result[key]["total_revenue"] = (result[key]["total_revenue"] || 0) + (Number(d.money_vnd) || 0);
      }
    }

    // 2. Số lượng user mới (_customer)
    if (_total_customer) {
      const users = await fastify.prisma.user.findMany({
        where: {
          deletedAt: null,
          createdAt: {
            gte: startDate.toJSDate(),
            lte: endDate.toJSDate(),
          },
        },
        select: { createdAt: true },
      });

      for (const u of users) {
        const key = DateTime.fromJSDate(u.createdAt).toFormat("ccc dd/MM");
        result[key]["total_customer"] = (result[key]["total_customer"] || 0) + 1;
      }
    }

    // 3. Tổng điểm cộng (_total_points)
    if (_total_points) {
      const transactions = await fastify.prisma.transaction.findMany({
        where: {
          deletedAt: null,
          type: "credit",
          createdAt: {
            gte: startDate.toJSDate(),
            lte: endDate.toJSDate(),
          },
        },
        select: { createdAt: true, points: true },
      });

      for (const t of transactions) {
        const key = DateTime.fromJSDate(t.createdAt).toFormat("ccc dd/MM");
        result[key]["total_points"] = (result[key]["total_points"] || 0) + t.points;
      }
    }
    // 3. Tổng điểm cộng (_total_points_used)
    if (_total_points_used) {
      const transactions = await fastify.prisma.transaction.findMany({
        where: {
          deletedAt: null,
          type: "debit",
          createdAt: {
            gte: startDate.toJSDate(),
            lte: endDate.toJSDate(),
          },
        },
        select: { createdAt: true, points: true },
      });

      for (const t of transactions) {
        const key = DateTime.fromJSDate(t.createdAt).toFormat("ccc dd/MM");
        result[key]["total_points_used"] = (result[key]["total_points_used"] || 0) + t.points;
      }
    }

    // 4. Số lượng entity links (_entity_links)
    if (_entity_links) {
      const entities = await fastify.prisma.entityLink.findMany({
        where: {
          deletedAt: null,
          createdAt: {
            gte: startDate.toJSDate(),
            lte: endDate.toJSDate(),
          },
        },
        select: { createdAt: true },
      });

      for (const e of entities) {
        const key = DateTime.fromJSDate(e.createdAt).toFormat("ccc dd/MM");
        result[key]["entity_links"] = (result[key]["entity_links"] || 0) + 1;
      }
    }
    // 4. Số lượng googleStackingLinks (_google_stacking_link)
    if (_google_stacking_link) {
      const googleStackingLinks = await fastify.prisma.googleStackingLink.findMany({
        where: {
          deletedAt: null,
          createdAt: {
            gte: startDate.toJSDate(),
            lte: endDate.toJSDate(),
          },
        },
        select: { createdAt: true },
      });

      for (const e of googleStackingLinks) {
        const key = DateTime.fromJSDate(e.createdAt).toFormat("ccc dd/MM");
        result[key]["google_stacking_links"] = (result[key]["google_stacking_links"] || 0) + 1;
      }
    }
    // 4. Số lượng googleStackingLinks (_index_link)
    if (_index_link) {
      const indexLinks = await fastify.prisma.indexLink.findMany({
        where: {
          deletedAt: null,
          createdAt: {
            gte: startDate.toJSDate(),
            lte: endDate.toJSDate(),
          },
        },
        select: { createdAt: true },
      });

      for (const e of indexLinks) {
        const key = DateTime.fromJSDate(e.createdAt).toFormat("ccc dd/MM");
        result[key]["index_links"] = (result[key]["index_links"] || 0) + 1;
      }
    }

    return reply.status(200).send({
      success: true,
      data: Object.entries(result).map(([day, metrics]) => ({
        day,
        ...metrics,
      })),
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
