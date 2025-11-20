import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";
import dotenv from "dotenv";
dotenv.config();
import z from "zod";

const querySchema = z.object({
  _s: z.string().optional(),
  _page: z.coerce.number().min(1).default(1),
  _limit: z.coerce.number().min(1).max(200).default(10),
  _status: z.enum(["draft", "new", "running", "connecting", "completed","re_running", "cancel"]).optional(),
  _start_date: z.string().optional(),
  _end_date: z.string().optional(),
  _role: z.string().optional(),
  _order: z.enum(["asc", "desc"]).default("desc"),
  _deletedAt: z.enum(["all", "only_deleted", "only_active"]).default("only_active"),
});

export const getAllEntityRequest = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const startTime = Date.now(); // Lưu thời gian request bắt đầu
    const { id: userId, role } = request.user as { id: string, role: string };

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
      _role,
      _deletedAt
    } = queryParams as any;

    const isAdmin =
      (role === "admin" && _role === "admin") ||
      (role === "dev" && _role === "dev");
    // **2. Tạo điều kiện tìm kiếm**
    const where: any = {domains: "likepion"};

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
        { website: { contains: _s } },
        { id_tool: { contains: _s } },
        { id: { contains: _s } }, // Tìm kiếm id gần đúng (id là string)
        ...(isAdmin
          ? [{ user: { email: { contains: _s } } }]
          : []), // Tìm kiếm id gần đúng (id là string)
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
    const [entities, totalItems] = await Promise.all([
      fastify.prisma.entityRequest.findMany({
        where,
        select: {
          id: true,
          website: true,
          updatedAt: true,
          createdAt: true,

          status: true,
          entity_limit: true,
          id_tool: isAdmin ? true : undefined,
          user: isAdmin
            ? { select: { email: true } }  // ✅ Nếu admin thì select email
            : undefined,
          ...isAdmin && {
            checkedAt: true,
          },
          entityLinks: {
            select: {
              status: true,
              note: true,
              link_profile: true,
              link_post: true,
              // các trường khác nếu cần
            },
          },
        },
        skip: (_limit === "-1" ? 0 : (Number(_page) - 1) * Number(_limit)),
        take: (_limit === "-1" ? undefined : Number(_limit)),
        orderBy: { createdAt: _order || "desc" }
      }),
      fastify.prisma.entityRequest.count({ where }),
    ]);

    // **5. Tính toán phân trang**
    const pagination = getPaginationData(Number(_page), Number(_limit), totalItems, request.url, startTime);

    // Nếu không có dữ liệu
    if (!entities || entities.length === 0) {
      return reply.status(200).send({
        success: true,
        pagination,
        entities: [],
      });
    }

    const entityRatio = entities.map(entity => {
      const totalLinks = entity.entityLinks.length; // Tổng số links

      // Lọc lần 1: link_profile !== ""
      const filteredLinks1 = entity.entityLinks.filter((link: any) => link.link_profile !== "");

      // Lọc lần 2: link_profile !== "" && note === "stacking" && link_post !== link_profile
      const filteredLinks2 = entity.entityLinks.filter(
        (link: any) => link.link_profile !== "" && link.note === "stacking" && link.link_post !== link.link_profile
      );

      // Gộp hai mảng lại nhưng loại bỏ trùng lặp bằng Set
      const uniqueLinks = new Set([...filteredLinks1, ...filteredLinks2]);

      const entityLinks = uniqueLinks.size; // Số lượng link sau khi gộp mà không trùng lặp
      const ratio = entity.entity_limit > 0 ? (entityLinks / entity.entity_limit) * 100 : 0; // Tính đúng tỉ lệ


      return {
        ...entity,
        entityLinks: undefined,
        entity_limit: undefined,
        links: totalLinks,
        updatedAt: undefined,
        result: `${entityLinks} / ${entity.entity_limit} (${ratio.toFixed(2)} %)`, // Hiển thị đúng phần trăm
      };
    });

    return reply.status(200).send({
      message: "Retrieve data successfully!",
      success: true,
      pagination,
      entities: entityRatio,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};