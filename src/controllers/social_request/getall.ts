import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";
import dotenv from "dotenv";
dotenv.config();
import z from "zod";

const querySchema = z.object({
  _s: z.string().optional(),
  _page: z.coerce.number().min(1).default(1),
  _limit: z.coerce.number().min(1).max(100).default(10),
  _status: z.enum(["new", "pending", "running", "completed"]).optional(),
  _start_date: z.string().optional(),
  _end_date: z.string().optional(),
  _role: z.string().optional(),
  _order: z.enum(["asc", "desc"]).default("desc"),
  _deletedAt: z
    .enum(["all", "only_deleted", "only_active"])
    .default("only_active"),
});

export const getAllSocialRequest = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const startTime = Date.now(); // Lưu thời gian request bắt đầu
    const { id: userId, role } = request.user as { id: string; role: string };

    const queryParams = querySchema.parse(request.query);

    // **1. Lấy dữ liệu từ người dùng**
    const {
      _s,
      _page,
      _limit,
      _status,
      _start_date,
      _end_date,
      _order,
      _deletedAt,
      _role
    } = queryParams as any;

    const isAdmin =
      (role === "admin" && _role === "admin") ||
      (role === "dev" && _role === "dev");
    // **2. Tạo điều kiện tìm kiếm**
    const where: any = {
      domains: "likepion"
    };

    if (!isAdmin) {
      where.userId = userId; // Chỉ filter theo userId nếu KHÔNG phải admin
    }

    // 🟢 Xử lý điều kiện _deletedAt
    if (_deletedAt === "only_active") {
      where.deletedAt = null; // Chỉ lấy dữ liệu chưa bị xóa mềm
    } else if (_deletedAt === "only_deleted") {
      where.deletedAt = { not: null }; // Chỉ lấy dữ liệu đã bị xóa mềm
    }

    if (_status) where.status = { equals: _status };

    if (_s) {
      where.OR = [
        { name: { contains: _s } },
        { id: { contains: _s } }, 
        ...(isAdmin
          ? [{ user: { email: { contains: _s } } }]
          : []), 
      ];
    }

    const isValidDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime()); // Kiểm tra xem có phải ngày hợp lệ không
    };

    // **Lọc theo khoảng thời gian**
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

    // **3. Truy vấn dữ liệu từ bảng user**
    const [socialRequests, totalItems] = await Promise.all([
      fastify.prisma.socialRequest.findMany({
        where,
        select: {
          id: true,
          name: true,
          createdAt: true,
          status: true,
          social_links: true,
          socialgroup: {
            select: {
              name: true
            }
          },
          id_tool: isAdmin ? true : false,
          user: isAdmin
            ? { select: { email: true } } // ✅ Nếu admin thì select email
            : undefined,
        },
        skip: _limit === "-1" ? 0 : (Number(_page) - 1) * Number(_limit),
        take: _limit === "-1" ? undefined : Number(_limit),
        orderBy: { createdAt: _order || "desc" },
      }),
      fastify.prisma.socialRequest.count({ where }),
    ]);

    // **5. Tính toán phân trang**
    const pagination = getPaginationData(
      Number(_page),
      Number(_limit),
      totalItems,
      request.url,
      startTime
    );

    // Nếu không có dữ liệu
    if (!socialRequests || socialRequests.length === 0) {
      return reply.status(200).send({
        success: true,
        pagination,
        socialRequests: [],
      });
    }

    const socialRequestsRatio = socialRequests.map((item: any) => {
      const allLinks = item.social_links || [];

      const completedLinks = allLinks.filter(
        (link: any) => link.status === "completed" && link.link_post !== ""
      ).length;

      const ratio = allLinks?.length > 0 ? (completedLinks / allLinks?.length) * 100 : 0;

      return {
        ...item,
        social_links: undefined,
        links: completedLinks,
        total: allLinks?.length,
        result: `${completedLinks} / ${allLinks?.length} (${ratio.toFixed(2)}%)`,
      };
    });


    return reply.status(200).send({
      message: "Retrieve data successfully!",
      success: true,
      pagination,
      socialRequests: socialRequestsRatio,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
