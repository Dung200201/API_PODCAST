import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";
import dotenv from "dotenv";
dotenv.config();
import { IndexQuerySchema } from "../../schema/index_request";

export const getAllIndex = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const startTime = Date.now(); // Lưu thời gian request bắt đầu
    const { id: userId, role } = request.user as { id: string; role: string };
    const queryParams = IndexQuerySchema.parse(request.query);

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

    const isAdmin = role === "admin" && _role === "admin";

    // **2. Tạo điều kiện tìm kiếm**
    const where: any = {
      domains: "likepion"
    };

    if (!isAdmin) {
      where.userId = userId;
    }

    if (_deletedAt === "only_active") {
      where.deletedAt = null;
    } else if (_deletedAt === "only_deleted") {
      where.deletedAt = { not: null };
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
    const [indexs, totalItems] = await Promise.all([
      fastify.prisma.indexRequest.findMany({
        where,
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          indexlink: {
            select: {
              indexed: true,
            },
          },
          ...(isAdmin && {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          }),
        },
        skip: (_limit === "-1" ? 0 : (Number(_page) - 1) * Number(_limit)),
        take: (_limit === "-1" ? undefined : Number(_limit)),
        orderBy: { updatedAt: _order || "desc" }
      }),
      fastify.prisma.indexRequest.count({ where }),
    ]);

    const pagination = getPaginationData(Number(_page), Number(_limit), totalItems, request.url, startTime);

    // Nếu không có dữ liệu
    if (!indexs || indexs.length === 0) {
      return reply.status(200).send({
        success: true,
        pagination,
        indexRequests: [],
      });
    }

    const indexsWithRatio = indexs.map((index: any) => {
      const totalLinks = index.indexlink.length; // Tổng số links
      const indexedLinks = index.indexlink.filter((link: any) => link.indexed).length; // Số links đã index
      const ratio = totalLinks > 0 ? (indexedLinks / totalLinks) * 100 : 0; // Tính % (tránh chia cho 0)

      return {
        ...index,
        indexlink: undefined,
        links: totalLinks,
        ratio: `${indexedLinks} / ${totalLinks} (${ratio.toFixed(2)} %)`, // Làm tròn 2 số thập phân + thêm "%" hiển thị
      };
    });

    return reply.status(200).send({
      success: true,
      pagination,
      indexRequests: indexsWithRatio,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};

export const getAllIndexRequestWhereStatus = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const startTime = Date.now();
    const queryParams: any = IndexQuerySchema.safeParse(request.query);

    if (!queryParams.success) {
      return reply.status(400).send({ message: "Invalid query parameters", errors: queryParams.error.errors });
    }

    const {
      _s,
      _limit,
      _page,
      _status,
      _order,
    } = queryParams.data as any;

    const where: any = {
      domains: "likepion"
    };

    if (_status) {
      where.status = { in: Array.isArray(_status) ? _status : [_status] };
    }

    if (_s) {
      where.OR = [
        { name: { contains: _s } },
        { id: { contains: _s } },
      ];
    }

    const limit = _limit === -1 ? undefined : Number(_limit) || 10;

    const [indexs, totalItems] = await Promise.all([
      fastify.prisma.indexRequest.findMany({
        where,
        select: {
          id: true,
          status: true,
          createdAt: true,
          domains: true,
          indexlink: {
            select: {
              indexed: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        take: limit,
        orderBy: { createdAt: _order || "desc" }
      }),
      fastify.prisma.indexRequest.count({ where }),
    ]);

    const pagination = getPaginationData(Number(_page), Number(_limit), totalItems, request.url, startTime);

    if (!indexs || indexs.length === 0) {
      return reply.status(200).send({
        success: true,
        pagination,
        indexs: [],
      });
    }

    const indexsWithRatio = indexs.map((index: any) => {
      const totalLinks = index.indexlink.length; // Tổng số links
      const indexedLinks = index.indexlink.filter((link: any) => link.indexed).length; // Số links đã index
      const ratio = totalLinks > 0 ? (indexedLinks / totalLinks) * 100 : 0; // Tính % (tránh chia cho 0)

      return {
        ...index,
        indexlink: undefined,
        links: totalLinks,
        ratio: `${indexedLinks} / ${totalLinks} (${ratio.toFixed(2)} %)`, // Làm tròn 2 số thập phân + thêm "%" hiển thị
      };
    });

    return reply.status(200).send({
      success: true,
      pagination,
      indexRequests: indexsWithRatio,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};