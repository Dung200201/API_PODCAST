import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import dotenv from "dotenv";
import z from "zod";
import { getPaginationData } from "../../utils/pagination";
// import { getPaginationData } from "../../utils/pagination";

dotenv.config();

const querySchema = z.object({
  _page: z.preprocess(
    (val) => {
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().min(1).default(1)
  ),
  _limit: z.preprocess(
    (val) => {
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().min(-1).max(100).default(10)
  ),
  _start_date: z.string().optional(),
  _end_date: z.string().optional(),
  _status: z.string().optional(),
  _source: z.enum(["web", "api"]).optional(),
  _order: z.enum(["asc", "desc"]).default("desc"),
  _deletedAt: z.enum(["only_active", "only_deleted", "all"]).default("only_active"),
  _entityRequestId: z.string().optional(),
  _s: z.string().optional(),
});

export const downloadAllLink = async (
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
      _source,
      _order,
      _deletedAt,
      _entityRequestId,
      _s,
    } = parseResult.data;

    const entityRequest = await fastify.prisma.entityRequest.findFirst({
      where: { id: _entityRequestId },
      select: { entity_limit: true },
    });

    if (!entityRequest) {
      return reply.status(403).send({
        message: "Access denied. Invalid entityRequestId or you do not have permission.",
        success: false,
      });
    }

    // 🔍 Base condition dùng chung
    const baseCondition: any = {
      entityRequestId: _entityRequestId,
      link_profile: { not: "" },
    };

    if (_s) baseCondition.OR = [{ url: { contains: _s } }];
    if (_status) baseCondition.status = _status;
    if (_source) baseCondition.source = _source;

    if (_deletedAt === "only_active") {
      baseCondition.deletedAt = null;
    } else if (_deletedAt === "only_deleted") {
      baseCondition.deletedAt = { not: null };
    }

    const isValidDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime()); // Kiểm tra xem có phải ngày hợp lệ không
    };

    if (_start_date || _end_date) {
      baseCondition.updatedAt = {};

      if (_start_date && isValidDate(_start_date)) {
        const startDate = new Date(_start_date);
        startDate.setHours(0, 0, 0, 0);
        baseCondition.updatedAt.gte = startDate;
      }

      if (_end_date && isValidDate(_end_date)) {
        const endDate = new Date(_end_date);
        endDate.setHours(23, 59, 59, 999);
        baseCondition.updatedAt.lte = endDate;
      }
    }

    // 🥇 Bước 1: Lấy nonStacking
    const nonStacking = await fastify.prisma.entityLink.findMany({
      where: {
        ...baseCondition,
        note: { not: "stacking" },
        id_tool: {not: "Social"}
      },
      select: {
        site: true,
        link_profile: true,
        link_post: true,
        note: true,
      },
      orderBy: { updatedAt: _order },
    });

    const existingProfiles = new Set(nonStacking.map((item) => item.link_profile));

    // 🥈 Bước 2: Lấy stacking (lọc trong JS)
    const rawStacking = await fastify.prisma.entityLink.findMany({
      where: {
        ...baseCondition,
        note: "stacking",
      },
      select: {
        site: true,
        link_profile: true,
        link_post: true,
        note: true,
      },
      orderBy: { updatedAt: _order },
    });

    const stacking = rawStacking.filter(
      (item: any) => item.link_post !== item.link_profile && !existingProfiles.has(item.link_post)
    );

    const allLinks = [...nonStacking, ...stacking];
    const totalItems = allLinks.length;
    const ratio = totalItems > 0 ? (totalItems / entityRequest.entity_limit) * 100 : 0;

    // 📦 Phân trang
    let paginatedLinks = allLinks;
    if (_limit !== -1) {
      const startIndex = (_page - 1) * _limit;
      paginatedLinks = allLinks.slice(startIndex, startIndex + _limit);
    }

    const pagination = getPaginationData(
      _limit === -1 ? 1 : _page,
      _limit === -1 ? totalItems : _limit,
      totalItems,
      request.url,
      startTime
    );

    const now = new Date();
    const filename = `Export-${now.toISOString().replace(/[:.]/g, '-')}.txt`;
    // Tạo nội dung file txt
    const fileContent = paginatedLinks
      .map(link => link.link_post && link.link_post !== link.link_profile
        ? `${link.link_profile} -> ${link.link_post}`
        : link.link_profile
      )
      .join('\n');

    reply.header('Content-Type', 'text/plain');
    reply.header('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`);

    return reply.send(fileContent);
    
    return reply.status(200).send({
      message: "Retrieve data successfully!",
      success: true,
      pagination,
      ratio: `${ratio.toFixed(2)}%`,
      EntityLinksSuccess: nonStacking.length,
      entityLinks: paginatedLinks,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};