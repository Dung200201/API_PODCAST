import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";
import z from "zod";

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
  _order: z.enum(["asc", "desc"]).default("desc"),
  _deletedAt: z.enum(["only_active", "only_deleted", "all"]).default("only_active"),
  _podcastRequestId: z.string().optional(),
  _s: z.string().optional(), // search keyword
});

export const getAllPodcastLink = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const startTime = Date.now();

    // ✅ Validate query params
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
      _podcastRequestId,
      _s,
    } = parseResult.data;

    // ✅ Base filter
    const where: any = {};
    if (_podcastRequestId) where.podcastRequestId = _podcastRequestId;
    if (_status) where.status = _status;

    // ✅ Search
    if (_s) {
      where.OR = [
        { domain: { contains: _s } },
        { link_post: { contains: _s } },
        { note: { contains: _s } },
      ];
    }

    // ✅ Deleted filter
    if (_deletedAt === "only_active") {
      where.deletedAt = null;
    } else if (_deletedAt === "only_deleted") {
      where.deletedAt = { not: null };
    }

    // ✅ Date filter
    const isValidDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
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

    // ✅ Query song song: data + count
    const [podcastLinks, totalItems] = await Promise.all([
      fastify.prisma.podcastLink.findMany({
        where,
        select: {
          id: true,
          podcastRequestId: true,
          id_tool: true,
          domain: true,
          link_post: true,
          status: true,
          note: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
          // Lấy thông tin request cha
          // blog20Request: {
          //   select: {
          //     id: true,
          //     name: true,
          //     userId: true,
          //     status: true,
          //   },
          // },
        },
        skip: _limit === -1 ? 0 : (_page - 1) * _limit,
        take: _limit === -1 ? undefined : _limit,
        orderBy: [
          { createdAt: _order },
          { id: _order },
        ],
      }),

      fastify.prisma.podcastLink.count({ where }),
    ]);

    // Tính hiệu suất khi get theo _podcastRequestId 
    let performanceRate: number | null = null;
    let totalLinks: number | undefined;
    if (_podcastRequestId) {
      const requestData = await fastify.prisma.podcastRequest.findUnique({
        where: { id: _podcastRequestId },
        select: { target: true },
      });

      const target = requestData?.target ?? 0;
      totalLinks = totalItems;

      if (target > 0) {
        performanceRate = Number(((totalLinks / target) * 100).toFixed(2));
      } else {
        performanceRate = 0;
      }
    }

    // ✅ Pagination helper
    const pagination = getPaginationData(
      Number(_page),
      Number(_limit),
      totalItems,
      request.url,
      startTime
    );

    // ✅ Response
    const baseResponse: any = {
      message: "Retrieve blog20 links successfully!",
      success: true,
      pagination,
      entities: podcastLinks,
    };

    // ✅ Nếu có _podcastRequestId thì đổi trường total và thêm performanceRate
    if (_podcastRequestId) {
      baseResponse.totalLinks = totalLinks;
      baseResponse.performanceRate = performanceRate;
    } else {
      baseResponse.totalItems = totalItems;
    }

    return reply.status(200).send(baseResponse);
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
