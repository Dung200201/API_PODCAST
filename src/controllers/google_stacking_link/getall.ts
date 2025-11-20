import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";
import dotenv from "dotenv";
import z from "zod";

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
    z.number().min(-1).max(300).default(10)
  ),
  _role: z.string().optional(),
  _status: z.string().optional(),
  _source: z.enum(["web", "api"]).optional(),
  _order: z.enum(["asc", "desc"]).default("desc"),
  _deletedAt: z.enum(["only_active", "only_deleted", "all"]).default("only_active"),
  _ggStackingRequestId: z.string().optional(),
  _s: z.string().optional(),
});

export const getAllGoogleStackingLink = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
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
      _source,
      _order,
      _deletedAt,
      _ggStackingRequestId,
      _s,
    } = parseResult.data;

    // 🔍 Base condition dùng chung
    const where: any = {
      ggStackingRequestId: _ggStackingRequestId, domains: "likepion"
    };

    if (_s) where.OR = [{ url: { contains: _s } }];
    if (_status) where.status = _status;
    if (_source) where.source = _source;

    if (_deletedAt === "only_active") {
      where.deletedAt = null;
    } else if (_deletedAt === "only_deleted") {
      where.deletedAt = { not: null };
    }

    // 🥇 Bước 1: Lấy nonStacking
    const ggStackingLinks = await fastify.prisma.googleStackingLink.findMany({
      where: {
        ...where,
        note: { not: "stacking" },
      },
      select: {
        id: true,
        ggStackingRequestId: true,
        id_tool: true,
        site: true,
        status: true,
        link_post: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: _order },
    });


    const totalItems = ggStackingLinks.length;

    // 📦 Phân trang
    const pagination = getPaginationData(
      _limit === -1 ? 1 : _page,
      _limit === -1 ? totalItems : _limit,
      totalItems,
      request.url,
      startTime
    );

    if (!ggStackingLinks || ggStackingLinks.length === 0) {
      return reply.status(200).send({
        success: true,
        pagination,
        ggStackingLinks: [],
      });
    }

    return reply.status(200).send({
      message: "Retrieve data successfully!",
      success: true,
      pagination,
      ggStackingLinks: ggStackingLinks,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
