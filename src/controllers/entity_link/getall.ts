import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import dotenv from "dotenv";
import z from "zod";
import { getPaginationData } from "../../utils/pagination";

dotenv.config();

const querySchema = z.object({
  _page: z.preprocess(
    (val) => {
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().min(1).default(1)
  ),
  _limit: z.coerce.number().min(-1).max(500).default(10),
  _start_date: z.string().optional(),
  _end_date: z.string().optional(),
  _status: z.string().optional(),
  _source: z.enum(["web", "api"]).optional(),
  _order: z.enum(["asc", "desc"]).default("desc"),
  _deletedAt: z.enum(["only_active", "only_deleted", "all"]).default("only_active"),
  _entityRequestId: z.string().optional(),
  _s: z.string().optional(),
});

export const getAllEntityLink = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    // const { id: userId } = request.user as { id: string };
    const startTime = Date.now();
    const parseResult = querySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        message: "Invalid query parameters",
        errors: parseResult.error.errors,
      });
    }

    const {
      _page,
      _limit,
      _status,
      _start_date,
      _end_date,
      _order,
      _deletedAt,
      _entityRequestId,
      _s,
    } = parseResult.data;

    // 🔍 Base condition dùng chung
    const where: any = {
      entityRequestId: _entityRequestId, domains: "likepion"
    };

    if (_s) where.OR = [
      { site: { contains: _s } },
      { link_profile: { contains: _s } },
      { link_post: { contains: _s } },
    ];
    if (_status) where.status = _status;

    if (_deletedAt === "only_active") {
      where.deletedAt = null;
    } else if (_deletedAt === "only_deleted") {
      where.deletedAt = { not: null };
    }

    const isValidDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime()); // Kiểm tra xem có phải ngày hợp lệ không
    };

    if (_start_date || _end_date) {
      where.updatedAt = {};

      if (_start_date && isValidDate(_start_date)) {
        const startDate = new Date(_start_date);
        startDate.setHours(0, 0, 0, 0);
        where.updatedAt.gte = startDate;
      }

      if (_end_date && isValidDate(_end_date)) {
        const endDate = new Date(_end_date);
        endDate.setHours(23, 59, 59, 999);
        where.updatedAt.lte = endDate;
      }
    }

    // 
    const [entityLinks, totalItems] = await Promise.all([
      fastify.prisma.entityLink.findMany({
        where: {
          ...where,
        },
        select: {
          id: true,
          id_tool: true,
          site: true,
          link_profile: true,
          link_post: true,
          status: true,
          note: true,
          createdAt: true,
          updatedAt: true,
        },
        skip: (_limit === -1 ? 0 : (_page - 1) * _limit),
        take: (_limit === -1 ? undefined : _limit),
        orderBy: { createdAt: _order }
      }),
      fastify.prisma.entityLink.count({ where }),
    ]);


    const pagination = getPaginationData(Number(_page), Number(_limit), totalItems, request.url, startTime);

    return reply.status(200).send({
      message: "Retrieve data successfully!",
      success: true,
      pagination,
      entityLinks: entityLinks,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};