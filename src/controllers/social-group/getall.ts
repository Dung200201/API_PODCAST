import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";
import dotenv from "dotenv";
dotenv.config();

export const getAllTSocialGroup = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const { id: userId, role } = request.user as { id: string, role: string };

    const startTime = Date.now(); // Lưu thời gian request bắt đầu
    const {
      _s = "",
      _page = 1,
      _limit = 10,
      _order = "desc",
      _start_date,
      _status,
      _end_date,
      _role,
    } = request.query as any;

    const isAdmin = role === "admin" && _role === "admin";

    // Tạo điều kiện tìm kiếm trực tiếp
    const where: any = { deletedAt: null, domains: "likepion" };

    if (_s) {
      where.OR = [
        { name: {  contains: _s } }
      ];
    }

    if (_status) where.status = { equals: _status };

    if (!isAdmin) {
      where.userId = { equals: userId };
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

    // Truy vấn dữ liệu từ bảng 
    const [socialGroups, totalItems] = await Promise.all([
      fastify.prisma.socialGroup.findMany({
        where,
        select: {
          id: true,
          name: true,
          status: true,
          updatedAt: true,
        },
        skip: (_limit === "-1" ? 0 : (Number(_page || 1) - 1) * Number(_limit || 10)),
        take: (_limit === "-1" ? undefined : Number(_limit || 10)),
        orderBy: { updatedAt: _order || "desc" }
      }),
      fastify.prisma.socialGroup.count({ where }),
    ]);

    // Tính toán dữ liệu phân trang
    const pagination = getPaginationData(Number(_page), Number(_limit), totalItems, request.url, startTime);

    // Truy vấn dữ liệu từ bảng socialGroup
    if (!socialGroups.length) {
      return reply.status(200).send({
        success: true,
        pagination,
        socialGroups: [],
      });
    }

    return reply.status(200).send({
      success: true,
      pagination,
      socialGroups: socialGroups,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
