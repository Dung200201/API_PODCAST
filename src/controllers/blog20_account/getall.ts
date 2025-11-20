import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";
import z from "zod";
import dotenv from "dotenv";
dotenv.config();

const querySchema = z.object({
  _page: z.coerce.number().min(1).default(1),
  _limit: z.coerce.number().min(-1).max(1000).default(10),
  _status: z.enum(["live", "die"]).optional(),
  _order: z.enum(["asc", "desc"]).default("desc"),
  _deletedAt: z.enum(["only_active", "only_deleted", "all"]).default("only_active"),
  _blogGroupId: z.string().optional(),
  _s: z.string().trim().optional(),
  _role: z.string().optional(),
  _start_date: z.string().optional(),
  _end_date: z.string().optional(),
});

export const getAllBlog20Account = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const startTime = Date.now();
    const { id: userId, role } = request.user as { id: string; role: string };

    // ✅ Validate query
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
      _blogGroupId,
      _s,
      _role,
      _start_date,
      _end_date,
    } = parseResult.data;

    const isAdmin = role === "admin" && _role === "admin";

    // ✅ Kiểm tra quyền user
    let blogGroup;
    if (!isAdmin) {
      if (!_blogGroupId) {
        const pagination = getPaginationData(_page, _limit, 0, request.url, startTime);
        return reply.status(200).send({
          message: "Retrieve data successfully!",
          success: true,
          pagination,
          nameBlogGroup: null,
          blog20Accounts: [],
        });
      }

      // ✅ Kiểm tra BlogGroupId có thuộc về user không
      blogGroup = await fastify.prisma.blog20Group.findFirst({
        where: { id: _blogGroupId, userId },
        select: { name: true },
      });

      if (!blogGroup) {
        return reply.status(403).send({
          message: "Access denied. Invalid BlogGroupId or you do not have permission.",
          success: false,
        });
      }
    }

    // 🧩 Điều kiện truy vấn
    const where: any = {};

    if (!isAdmin) {
      where.blogGroupId = _blogGroupId;
    }

    if (_status) {
      where.status = _status;
    }

    // 🔍 Tìm kiếm theo chuỗi `_s`
    if (_s) {
      const isNumeric = !isNaN(Number(_s));
      where.OR = [
        { website: { contains: _s } },
        { username: { contains: _s } },
        { email: { contains: _s } },
        { note: { contains: _s } },
        { id: { equals: _s } },
      ];

      if (isNumeric) {
        where.OR.push({ password: { contains: _s } }); // optional nếu password chứa số
      }
    }

    // 🗑️ Lọc theo trạng thái xóa mềm
    if (_deletedAt === "only_active") {
      where.deletedAt = null;
    } else if (_deletedAt === "only_deleted") {
      where.deletedAt = { not: null };
    }

    // 📅 Lọc theo ngày tạo
    const isValidDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return !isNaN(d.getTime());
    };

    if (_start_date || _end_date) {
      where.createdAt = {};
      if (_start_date && isValidDate(_start_date)) {
        const startDate = new Date(_start_date);
        startDate.setHours(0, 0, 0, 0);
        where.createdAt.gte = startDate;
      }
      if (_end_date && isValidDate(_end_date)) {
        const endDate = new Date(_end_date);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // 🧾 Truy vấn dữ liệu
    const [blog20Accounts, totalItems] = await Promise.all([
      fastify.prisma.blog20Account.findMany({
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
          app_password: true,
          twoFA: true,
          quickLink: true,
          homeLink: true,
          note: true,
          status: true,
          createdAt: true,
        },
      }),
      fastify.prisma.blog20Account.count({ where }),
    ]);

    const pagination = getPaginationData(_page, _limit, totalItems, request.url, startTime);

    return reply.status(200).send({
      message: "Retrieve data successfully!",
      success: true,
      pagination,
      nameBlogGroup: blogGroup ? blogGroup.name : null,
      blog20Accounts,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
