import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";
import z from "zod";
import dotenv from "dotenv";
dotenv.config();

const querySchema = z.object({
  _page: z.coerce.number().min(1).default(1),
  _limit: z.coerce.number().min(-1).max(1000).default(10),
  _status: z.enum(["new", "live", "die"]).optional(),
  _order: z.enum(["asc", "desc"]).default("desc"),
  _deletedAt: z.enum(["only_active", "only_deleted", "all"]).default("only_active"),
  _podcastGroupId: z.string().optional(),
  _s: z.string().trim().optional(),
  _role: z.string().optional(),           // bạn giữ nguyên => giữ luôn
  _start_date: z.string().optional(),
  _end_date: z.string().optional(),
});

export const getAllPodcastAccount = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const startTime = Date.now();
    const { id: userId, role } = request.user as { id: string; role: string };

    // validate query
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
      _order,
      _deletedAt,
      _podcastGroupId,
      _s,
      _role,
      _start_date,
      _end_date,
    } = parseResult.data;

    // ✔ bạn yêu cầu giữ nguyên cơ chế admin cũ
    const isAdmin = role === "admin" && _role === "admin";

    // ✔ User thường phải có podcastGroupId
    let groupInfo = null;

    if (!isAdmin) {
      // User thường BẮT BUỘC phải truyền podcastGroupId
      if (!_podcastGroupId) {
        return reply.status(200).send({
          message: "Retrieve data successfully!",
          success: true,
          pagination: getPaginationData(_page, _limit, 0, request.url, startTime),
          namePodcastGroup: null,
          podcastAccounts: [],
        });
      }

      // Kiểm tra group thuộc về user
      groupInfo = await fastify.prisma.podcastGroup.findFirst({
        where: { id: _podcastGroupId, userId },
        select: { name: true },
      });

      if (!groupInfo) {
        return reply.status(403).send({
          message: "Access denied. Invalid PodcastGroupId",
          success: false,
        });
      }
    }

    // BUILD WHERE CONDITION
    const where: any = {};

    if (!isAdmin) {
      where.podcastGroupId = _podcastGroupId;
    }

    if (_status) {
      where.status = _status;
    }

    // 🔎 FULL TEXT SEARCH
    if (_s) {
      const isNumeric = !isNaN(Number(_s));

      where.OR = [
        { id: { contains: _s } },
        { website: { contains: _s } },
        { username: { contains: _s } },
        { email: { contains: _s } },
        { note: { contains: _s } },
        { app_password: { contains: _s } },
        { twoFA: { contains: _s } },
      ];

      if (isNumeric) {
        where.OR.push({ password: { contains: _s } });
        where.OR.push({ pass_mail: { contains: _s } });
      }
    }

    // 🗑 Filter deletedAt
    if (_deletedAt === "only_active") {
      where.deletedAt = null;
    } else if (_deletedAt === "only_deleted") {
      where.deletedAt = { not: null };
    }

    // 📅 Date filter
    if (_start_date || _end_date) {
      where.createdAt = {};

      if (_start_date) {
        where.createdAt.gte = new Date(`${_start_date} 00:00:00`);
      }

      if (_end_date) {
        where.createdAt.lte = new Date(`${_end_date} 23:59:59`);
      }
    }

    // QUERY DATA
    const [podcastAccounts, totalItems] = await Promise.all([
      fastify.prisma.podcastAccount.findMany({
        where,
        skip: _limit === -1 ? 0 : (_page - 1) * _limit,
        take: _limit === -1 ? undefined : _limit,
        orderBy: { createdAt: _order },

        select: {
          id: true,
          website: true,
          username: true,
          email: true,
          password: true,
          pass_mail: true,       
          twoFA: true,
          cookies: true,
          note: true,
          status: true,
          createdAt: true,
          app_password: true,
        },
      }),

      fastify.prisma.podcastAccount.count({ where }),
    ]);

    // RESPONSE
    return reply.status(200).send({
      message: "Retrieve data successfully!",
      success: true,
      pagination: getPaginationData(_page, _limit, totalItems, request.url, startTime),
      namePodcastGroup: groupInfo ? groupInfo.name : null,
      podcastAccounts,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
