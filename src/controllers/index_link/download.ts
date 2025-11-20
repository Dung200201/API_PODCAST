import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import dotenv from "dotenv";
import z from "zod";
dotenv.config();

const querySchema = z.object({
  _page: z.coerce.number().min(1).default(1),
  _limit: z.coerce.number().int().refine(val => val === -1 || (val >= 1 && val <= 100), {
    message: "_limit must be between 1-100 or -1 for all data"
  }).default(10),
  _status: z.enum(["new", "pending", "indexing", "done", "failed"]).optional(),
  _source: z.enum(["web", "api"]).optional(),
  _indexed: z.string().optional().transform((val) => {
    if (val === undefined) return undefined;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }),
  _order: z.enum(["asc", "desc"]).default("desc"),
  _deletedAt: z.enum(["only_active", "only_deleted", "all"]).default("only_active"),
  _indexRequestId: z.string().optional(),
  _s: z.string().trim().optional(),
  _role: z.string().optional(),
  _start_date: z.string().optional(),
  _end_date: z.string().optional(),
});

export const downloadIndexLink = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const { indexRequestId } = request.params;

    // Lấy các link và cả name của request
    const indexLinks = await fastify.prisma.indexLink.findMany({
      where: { indexRequestId: indexRequestId, status: "done", indexed: true },
      select: { 
        url: true, 
        indexRequest: { select: { name: true } }
      },
    });

    if (!indexLinks || indexLinks.length === 0) {
      return reply.status(404).send({
        message: "No links found for this indexRequestId.",
        success: false,
      });
    }

    // Lấy tên từ indexRequest
    const requestName = indexLinks[0]?.indexRequest?.name || "download";

    // Xử lý tên file: bỏ ký tự đặc biệt, thay dấu cách bằng dấu gạch ngang
    const safeFileName = requestName
      .replace(/[^a-zA-Z0-9\s]/g, '') // Xóa ký tự đặc biệt
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase(); // Ví dụ: "My Request Name" -> "my-request-name"

    // Tạo nội dung file txt
    const fileContent = indexLinks.map(link => link.url).join('\n');

    reply.header('Content-Type', 'text/plain');
    reply.header('Content-Disposition', `attachment; filename="${safeFileName}.txt"`);

    return reply.send(fileContent);
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};

export const downloadIndexLinksAll = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const parseResult = querySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({ message: "Invalid query parameters", errors: parseResult.error.errors });
    }

    const { _status, _source, _indexed, _order, _deletedAt, _indexRequestId, _s, _role, _start_date, _end_date } = parseResult.data;
    const { role } = request.user;

    const isAdmin = role === 'admin' && _role === 'admin';

    const where: any = {};
    if (!isAdmin) {
      where.indexRequestId = _indexRequestId;
    }

    if (_s) {
      const isNumeric = !isNaN(Number(_s));
      where.OR = [
        { url: { contains: _s } },
        { id: { equals: _s } },
      ];
      if (isNumeric) where.OR.push({ response: Number(_s) });
    }

    if (_status) where.status = _status;
    if (_source) where.source = _source;
    if (_indexed !== undefined) where.indexed = _indexed;

    if (_deletedAt === "only_active") where.deletedAt = null;
    else if (_deletedAt === "only_deleted") where.deletedAt = { not: null };

    // Date filter
    const isValidDate = (d: string) => !isNaN(new Date(d).getTime());
    if (_start_date || _end_date) {
      where.createdAt = {};
      if (_start_date && isValidDate(_start_date)) {
        const d = new Date(_start_date);
        d.setHours(0, 0, 0, 0);
        where.createdAt.gte = d;
      }
      if (_end_date && isValidDate(_end_date)) {
        const d = new Date(_end_date);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }

    const indexLinks = await fastify.prisma.indexLink.findMany({
      where,
      orderBy: { createdAt: _order || "desc" },
      select: {
        id: true,
        url: true,
        status: true,
        response: true,
        indexed: true,
        createdAt: true,
      }
    });

    const now = new Date();
    const filename = `Export-${now.toISOString().replace(/[:.]/g, '-')}.txt`;
    // Tạo nội dung file txt
    const fileContent = indexLinks.map(link => link.url).join('\n');

    reply.header('Content-Type', 'text/plain');
    reply.header('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`);

    return reply.send(fileContent);
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
