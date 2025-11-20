import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";
import dotenv from "dotenv";
dotenv.config();
import z from "zod";

const querySchema = z.object({
  _page: z.coerce.number().min(1).default(1),
  _limit: z.coerce.number().min(1).max(1000).default(10),
  _status: z.enum(["new", "pending", "indexing", "done", "failed"]).optional(),
  _source: z.enum(["web", "api"]).optional(),
  _indexed: z.string().optional().transform((val) => {
    if (val === undefined) return undefined;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }),
  _check_indexed_for: z.coerce.number().min(0).optional(),
  _check_indexed_interval: z.coerce.number().min(0).optional(),
  _order: z.enum(["asc", "desc"]).default("desc"),
  _deletedAt: z.enum(["only_active", "only_deleted", "all"]).default("only_active"),
  _indexRequestId: z.string().optional(),
  _s: z.string().trim().optional(),
  _role: z.string().optional(),
  _start_date: z.string().optional(),
  _end_date: z.string().optional(),
});

export const getAllIndexLink = async (
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
    const { _page, _limit, _status, _source, _indexed, _order, _end_date, _start_date, _deletedAt, _indexRequestId, _s, _role, _check_indexed_for, _check_indexed_interval } = parseResult.data;

    const isAdmin = role === "admin" && _role === "admin";

    let indexRequest;
    if (!isAdmin) {
      // ✅ Kiểm tra `indexRequestId` có tồn tại và thuộc về người dùng không
      indexRequest = await fastify.prisma.indexRequest.findFirst({
        where: { id: _indexRequestId, userId: userId },
        select: { name: true },
      });

      if (!indexRequest) {
        return reply.status(403).send({
          message: "Access denied. Invalid indexRequestId or you do not have permission.",
          success: false,
        });
      }
    }

    // 🟢 **Tạo điều kiện truy vấn**
    const where: any = {
      domains: "likepion"
    };

    if (!isAdmin) {
      where.indexRequestId = _indexRequestId; // Chỉ filter theo userId nếu KHÔNG phải admin
    }

    if (_s) {
      const isNumeric = !isNaN(Number(_s)); // Kiểm tra nếu _s là số

      where.OR = [
        { url: { contains: _s } },
        { id: { equals: _s } },
      ];

      if (isNumeric) {
        where.OR.push({ response: Number(_s) });
      }
    }

    if (_status) where.status = _status;
    if (_source) where.source = _source;
    if (_indexed) where.indexed = _indexed

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

    // Check theo kiểu ví dfuj là 10 ngày gần check lấy dữ liệu cả createdAt và updatedAt
    // if (_check_indexed_for) {
    //   const today = new Date();
    //   const fromDate = new Date();
    //   fromDate.setDate(today.getDate() - _check_indexed_for);

    //   // Có thể filter theo updatedAt hoặc createdAt, tùy nhu cầu:
    //   where.OR = [
    //     { updatedAt: { gte: fromDate } },
    //     { createdAt: { gte: fromDate } },
    //   ];
    // }

    // Lọc theo k lấy updatedAt trong 2 hôm gần nhất
    if (_check_indexed_interval) {
      const today = new Date();
      const fromDate = new Date();
      fromDate.setDate(today.getDate() - _check_indexed_interval);

      // Điều kiện: updatedAt < fromDate (tức là updated cách đây > _check_indexed_interval ngày)
      where.updatedAt = { lt: fromDate };
    }

    // **3. Truy vấn dữ liệu từ bảng user**
    let [indexLinks, totalItems]: any = await Promise.all([
      fastify.prisma.indexLink.findMany({
        where,
        skip: ( (Number(_page) - 1) * Number(_limit)),
        take: ( Number(_limit)),
        orderBy: { createdAt: _order || "desc" },
        select: {
          id: true,
          url: true,
          source: true,
          response: true,
          status: true,
          indexed: true,
          createdAt: true,
          updatedAt: true,
        }
      }),
      fastify.prisma.indexLink.count({ where }),
    ]);

    if (_check_indexed_for) {
      const maxDiffMs = _check_indexed_for * 24 * 60 * 60 * 1000; // số milliseconds
      indexLinks = indexLinks.filter((link: any) => {
        const diff = Math.abs(new Date(link.updatedAt).getTime() - new Date(link.createdAt).getTime());
        return diff <= maxDiffMs;
      });
    }

    // **5. Tính toán phân trang**
    const pagination = getPaginationData(Number(_page), Number(_limit), totalItems, request.url, startTime);

    // Nếu không có dữ liệu
    if (!indexLinks || indexLinks.length === 0) {
      return reply.status(200).send({
        success: true,
        pagination,
        indexLinks: [],
      });
    }

    // đếm xem bao nhiêu link được index
    const indexedLinks = indexLinks.filter((link: any) => link.indexed && link.status === 'done').length;
    const ratio = indexedLinks.length > 0 ? (indexedLinks / indexedLinks.length) * 100 : 0;

    const indexsFormat = indexLinks.map((index: any) => {
      return {
        ...index,
        deletedAt: undefined,
      };
    });

    return reply.status(200).send({
      message: "Retrieve data successfully!",
      success: true,
      pagination,
      nameIndexRequest: indexRequest ? indexRequest.name : null,
      ratio: `${ratio}%`,
      indexedLinks: indexedLinks,
      indexLinks: indexsFormat
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};

export const getAllIndexLinkTools = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    // Vlaidate query
    const parseResult = querySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ message: "Invalid query parameters", errors: parseResult.error.errors });
    }

    // **1. Lấy dữ liệu từ người dùng**
    const { _status, _source, _indexed, _order, _s, _indexRequestId } = parseResult.data as any;

    // 🟢 **Tạo điều kiện truy vấn**
    const where: any = {};

    if (_s) {
      const isNumeric = !isNaN(Number(_s)); // Kiểm tra nếu _s là số

      where.OR = [
        { url: { contains: _s } },
        { id: { equals: _s } },
      ];

      if (isNumeric) {
        where.OR.push({ response: Number(_s) });
      }
    }

    if (_status) where.status = _status;
    if (_source) where.source = _source;
    if (_indexed) where.indexed = _indexed
    if (_indexRequestId) where.indexRequestId = _indexRequestId;

    // **3. Truy vấn dữ liệu từ bảng user**
    const indexLinks = await fastify.prisma.indexLink.findMany({
      where,
      orderBy: { createdAt: _order || "desc" },
      select: {
        id: true,
        url: true,
        source: true,
        response: true,
        status: true,
        indexed: true,
        updatedAt: true,
        information: true,
        push: true,
      }
    });

    // Nếu không có dữ liệu
    if (!indexLinks || indexLinks.length === 0) {
      return reply.status(200).send({
        success: true,
        indexLinks: [],
      });
    }

    // đếm xem bao nhiêu link được index
    const indexedLinks: any = indexLinks.filter((link: any) => link.indexed && link.status === 'done').length;
    const ratio = indexedLinks.length > 0 ? (indexedLinks / indexedLinks?.length) * 100 : 0;

    return reply.status(200).send({
      message: "Retrieve data successfully!",
      success: true,
      count: indexLinks.length,
      ratio: `${ratio}%`,
      indexedLinks: indexedLinks,
      indexLinks: indexLinks
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};