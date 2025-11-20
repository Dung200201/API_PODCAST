import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";
import dotenv from "dotenv";
dotenv.config();

export const getAllBlog20Group = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const { id: authUserId, role } = request.user as { id: string; role: string };
    const startTime = Date.now();

    const {
      _s = "",
      _page = 1,
      _limit = 10,
      _order = "desc",
      _start_date,
      _end_date,
      _status,
      userId, // filter theo userId từ query
    } = request.query as any;

    const isAdmin = role === "admin";

    const pageNum = Number(_page) || 1;
    const limitNum = Number(_limit) || 10;

    // Build điều kiện tìm kiếm
    const where: any = { deletedAt: null };

    if (_s) {
      where.OR = [{ name: { contains: _s, mode: "insensitive" } }];
    }

    if (_status) where.status = { equals: _status };

    if (userId) {
      where.userId = { equals: userId };
    } else if (!isAdmin) {
      where.userId = { equals: authUserId };
    }

    const isValidDate = (dateStr: string) => !isNaN(new Date(dateStr).getTime());

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

    // **Truy vấn dữ liệu từ bảng Blog20Group**
    const [blogGroups, totalItems] = await Promise.all([
      fastify.prisma.blog20Group.findMany({
        where,
        select: {
          id: true,
          name: true,
          status: true,
          updatedAt: true,
        },
        skip: limitNum === -1 ? 0 : (pageNum - 1) * limitNum,
        take: limitNum === -1 ? undefined : limitNum,
        orderBy: { updatedAt: _order || "desc" },
      }),
      fastify.prisma.blog20Group.count({ where }),
    ]);

    // **Tính toán phân trang**
    const pagination = getPaginationData(pageNum, limitNum, totalItems, request.url, startTime);

    // Nếu không có dữ liệu
    if (!blogGroups.length) {
      return reply.status(200).send({
        success: true,
        pagination,
        blogGroups: [],
      });
    }

    return reply.status(200).send({
      success: true,
      pagination,
      blogGroups,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
