import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";
import dotenv from "dotenv";
dotenv.config();
import z from "zod";

const querySchema = z.object({
  _page: z.coerce.number().min(1).default(1),
  _limit: z.coerce.number().min(-1).max(1000).default(10),
  _status: z.enum(["uncheck", "checking", "live", "limit", "error"]).optional(),
  _order: z.enum(["asc", "desc"]).default("desc"),
  _deletedAt: z.enum(["only_active", "only_deleted", "all"]).default("only_active"),
  _socialGroupId: z.string().optional(),
  _s: z.string().trim().optional(),
  _role: z.string().optional(),
  _start_date: z.string().optional(),
  _end_date: z.string().optional(),
});

export const getAllSocialAccount = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const startTime = Date.now(); // Lưu thời gian request bắt đầu
    const { id: userId, role } = request.user as { id: string; role: string };
    
    // Vlaidate query
    const parseResult = querySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ message: "Invalid query parameters", errors: parseResult.error.errors });
    }

    // **1. Lấy dữ liệu từ người dùng**
    const { _page, _limit, _status, _order, _end_date, _start_date, _deletedAt, _socialGroupId, _s, _role } = parseResult.data;

    const isAdmin = role === "admin" && _role === "admin";

    let socialGroup;
    if (!isAdmin) {

      if (!_socialGroupId) {
        const pagination = getPaginationData(Number(_page), Number(_limit), 0, request.url, startTime);
        return reply.status(200).send({
          message: "Retrieve data successfully!",
          success: true,
          pagination,
          nameSocialGroup:  null,
          socialAccounts: []
        });
      }

      // ✅ Kiểm tra `_socialGroupId` có tồn tại và thuộc về người dùng không
      socialGroup = await fastify.prisma.socialGroup.findFirst({
        where: { id: _socialGroupId, userId },
        select: { name: true },
      });

      if (!socialGroup) {
        return reply.status(403).send({
          message: "Access denied. Invalid SocialGroupId or you do not have permission.",
          success: false,
        });
      }
    }
    // 🟢 **Tạo điều kiện truy vấn**
    const where: any = {
      domains: "likepion"
    };

    if (!isAdmin) {
      where.socialGroupId  = _socialGroupId; // Chỉ filter theo userId nếu KHÔNG phải admin
    }

    if (_s) {
      const isNumeric = !isNaN(Number(_s)); // Kiểm tra nếu _s là số
    
      where.OR = [
        { website: { contains: _s } },
        { id: { equals: _s } },
      ];
    
      if (isNumeric) {
        where.OR.push({ response: Number(_s) });
      }
    }

    if (_status) where.status = _status;

    // 🗑️ Xử lý điều kiện xóa mềm
    if (_deletedAt === "only_active") {
      where.deletedAt = null;
    } else if (_deletedAt === "only_deleted") {
      where.deletedAt = { not: null };
    }

    const isValidDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime()); // Kiểm tra xem có phải ngày hợp lệ không
    };

    // **Lọc theo khoảng thời gian**
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

    // **3. Truy vấn dữ liệu từ bảng user**
    const [socialAccounts, totalItems]: any = await Promise.all([
      fastify.prisma.socialAccount.findMany({
        where,
        skip: (_limit === -1 ? 0 : (_page - 1) * _limit),
        take: (_limit === -1 ? undefined : Number(_limit)),
        orderBy: { createdAt: _order || "desc" },
        select: {
          id: true,
          website: true,
          email: true,
          username: true,
          password: true,
          status: true,
          note: true,
          twoFA: true,
          active: true,
          createdAt: true,
        }
      }),
      fastify.prisma.socialAccount.count({ where }),
    ]);

    // **5. Tính toán phân trang**
    const pagination = getPaginationData(Number(_page), Number(_limit), totalItems, request.url, startTime);

    // Nếu không có dữ liệu
    if (!socialAccounts || socialAccounts.length === 0) {
      return reply.status(200).send({
        success: true,
        pagination,
        socialAccounts: [],
      });
    }
 

    return reply.status(200).send({
      message: "Retrieve data successfully!",
      success: true,
      pagination,
      nameSocialGroup: socialGroup ? socialGroup.name : null,
      socialAccounts: socialAccounts
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};