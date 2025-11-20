import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";
import z from "zod";

const querySchema = z.object({
  _s: z.string().optional(),
  _page: z.coerce.number().min(1).default(1),
  _limit: z.coerce.number().min(1).max(200).default(10),
  _status: z.enum(["new", "running", "completed", "cancel"]).optional(),
  _start_date: z.string().optional(),
  _end_date: z.string().optional(),
  _role: z.string().optional(),
  _typeRequest: z.enum(["register", "post"]).optional(),
  _order: z.enum(["asc", "desc"]).default("desc"),
  _deletedAt: z.enum(["all", "only_deleted", "only_active"]).default("only_active"),
});

export const getAllPodcastRequest = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const startTime = Date.now();
    const { id: userId, role } = request.user as { id: string; role: string };

    // parse + validate query
    const queryParams = querySchema.parse(request.query);
    const {
      _s,
      _page,
      _limit,
      _status,
      _start_date,
      _end_date,
      _order,
      // _role,
      _typeRequest,
      _deletedAt
    } = queryParams as any;

    const isAdmin = role === "admin" || role === "dev";

    // build where clause
    const where: any = {};

    if (!isAdmin) {
      where.userId = userId;
    }

    // deletedAt filter
    if (_deletedAt === "only_active") {
      where.deletedAt = null;
    } else if (_deletedAt === "only_deleted") {
      where.deletedAt = { not: null };
    }

    // typeRequest filter
    if (_typeRequest) where.typeRequest = { equals: _typeRequest };

    // status filter
    if (_status) where.status = { equals: _status };

    // search filter
    if (_s) {
      where.OR = [
        { name: { contains: _s } },
        { id_tool: { contains: _s } },
        { id: { contains: _s } },
        ...(isAdmin ? [{ user: { email: { contains: _s } } }] : []),
      ];
    }

    // date range filter on updatedAt
    const isValidDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return !isNaN(d.getTime());
    };

    if (_start_date || _end_date) {
      where.updatedAt = {};
      if (_start_date && isValidDate(_start_date)) {
        const s = new Date(_start_date);
        s.setHours(0, 0, 0, 0);
        where.updatedAt.gte = s;
      }
      if (_end_date && isValidDate(_end_date)) {
        const e = new Date(_end_date);
        e.setHours(23, 59, 59, 999);
        where.updatedAt.lte = e;
      }
    }

    // compute skip/take safely (zod coerced to number)
    const take = (_limit === -1 ? undefined : Number(_limit));
    const skip = (_limit === -1 ? 0 : (Number(_page) - 1) * Number(_limit));

    // build select safely (không spread boolean)
    const selectBase: any = {
      id: true,
      name: true,
      id_tool: true,
      status: true,
      typeRequest: true,
      auction_price: true,
      target: true,
      createdAt: true,
      updatedAt: true,
      podcastGroupId: true,
      data: true,
      podcast_link: {
        select: {
          id: true,
          status: true,
          link_post: true,
          note: true,
        },
      },
    };

    if (isAdmin) {
      selectBase.user = { select: { email: true } };
    }

    // query DB (findMany + count)
    const [requests, totalItems] = await Promise.all([
      fastify.prisma.podcastRequest.findMany({
        where,
        select: selectBase,
        skip,
        take,
        orderBy: { createdAt: _order || "desc" },
      }),
      fastify.prisma.podcastRequest.count({ where }),
    ]);

    const pagination = getPaginationData(Number(_page), Number(_limit), totalItems, request.url, startTime);

    if (!requests || requests.length === 0) {
      return reply.status(200).send({
        message: "No podcast requests found.",
        success: true,
        pagination,
        podcasts: [],
      });
    }

    // 1️⃣ Lấy danh sách podcastGroupId của các request "register"
    const registerGroupIds = [
      ...new Set(
        requests
          .filter((r: any) => r.typeRequest === "register" && r.podcastGroupId)
          .map((r: any) => r.podcastGroupId)
      ),
    ];

    let linkCountByGroup: Record<string, number> = {};

    if (registerGroupIds.length > 0) {
      // 2️⃣ Query tất cả link thuộc request type="post" có podcastGroupId trong danh sách trên
      const postRequests = await fastify.prisma.podcastRequest.findMany({
        where: {
          podcastGroupId: { in: registerGroupIds },
          typeRequest: "post",
          deletedAt: null,
        },
        select: {
          podcastGroupId: true,
          podcast_link: {
            where: { link_post: { not: null } },
            select: { id: true }
          },
        },
      });

      // 3️⃣ Gom tổng số link theo podcastGroupId
      linkCountByGroup = postRequests.reduce((acc, r: any) => {
        const count = r.podcast_link?.length || 0;
        acc[r.podcastGroupId] = (acc[r.podcastGroupId] || 0) + count;
        return acc;
      }, {} as Record<string, number>);
    }

    // LẤY TOTAL ACCOUNT LIVE THEO podcastGroupId
    const allGroupIds = [
      ...new Set(requests.filter((r: any) => r.podcastGroupId).map((r: any) => r.podcastGroupId))
    ];

    let accountCountMap: Record<string, number> = {};

    if (allGroupIds.length > 0) {
      const accountsByGroup = await fastify.prisma.podcastAccount.groupBy({
        by: ["podcastGroupId"],
        where: {
          podcastGroupId: { in: allGroupIds },
          status: "live",
          deletedAt: null,
        },
        _count: { podcastGroupId: true },
      });

      accountCountMap = accountsByGroup.reduce((acc, item) => {
        acc[item.podcastGroupId] = item._count.podcastGroupId;
        return acc;
      }, {} as Record<string, number>);
    }

    // ====== format kết quả ======
    const formatted = requests.map((r: any) => {
      let total_links = Array.isArray(r.podcast_link)
        ? r.podcast_link.filter((l: any) => l.link_post != null).length
        : 0;

      // nếu là "register" thì lấy tổng link của các request post cùng podcastGroupId
      if (r.typeRequest === "register" && r.podcastGroupId) {
        total_links = linkCountByGroup[r.podcastGroupId] || 0;
      }

      const { podcast_link, ...rest } = r;


      const target = Number(r.target) || 0;

      const percent_completed =
        target > 0 ? Number(((total_links / target) * 100).toFixed(2)) : 0;

      return {
        ...rest,
        total_links,
        totals_account: accountCountMap[r.podcastGroupId] || 0,
        percent_completed
      };
    });

    // const total_links_all = formatted.reduce(
    //   (sum: number, r: any) => sum + (r.total_links || 0),
    //   0
    // );

    return reply.status(200).send({
      message: "Retrieve blog20 requests successfully!",
      success: true,
      pagination,
      // total: { totalItems, total_links_all },
      totalItems: totalItems,
      podcasts: formatted,
    });
  } catch (error: any) {
    fastify.log?.error?.({ err: error, msg: "getAllBlog20Request error" });
    handleErrorResponse(reply, error);
  }
};