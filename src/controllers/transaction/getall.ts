import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";
import dotenv from "dotenv";
dotenv.config();

const validType = ['credit', 'debit'];

export const getAllTransaction = async (
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
      _end_date,
      _type = "",
      _service = "",
      _role = "",
      _code = ""
    } = request.query as any;

    const isAdmin = role === "admin" && _role === "admin";


    // Tính toán các giá trị phân trang
    if (_type && !validType.includes(_type)) {
      return reply.status(400).send({ message: `Invalid type. Valid values: ${validType.join(", ")}`, success: false });
    }

    // Tạo điều kiện tìm kiếm trực tiếp
    const where: any = { deletedAt: null,domains: "likepion" };

    if (_type) where.type = _type;
    if (_service) where.service = { contains: _service };
    if (_code) {
      where.OR = [
        { deposit: { order_code: { contains: _code } } }
      ];
    }
    if (_s) {
      where.OR = [
        { id: { contains: _s } },
        { reference: { contains: _s } },
        { service: { contains: _s } },
        { user: { email: { contains: _s } } },
      ];
    }

    if (!isAdmin) {
      where.userId = { equals: userId };
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

    // Truy vấn dữ liệu từ bảng transaction
    const [transaction, totalItems] = await Promise.all([
      fastify.prisma.transaction.findMany({
        where,
        select: {
          type: true,
          ...(isAdmin && {
            id: true,
            user: {
              select: {
                email: true,
              },
            },
          }),
          service: true,
          description: true,
          points: true,
          reference: true,
          createdAt: true,
          deposit: {
            select: {
              order_code: true,
              ...(isAdmin && {
                credit: {
                  select: {
                    name: true,
                  },
                },
                package_name: true,
                currency: true
              }),
            }
          },
        },

        skip: (_limit === "-1" ? 0 : (Number(_page || 1) - 1) * Number(_limit || 10)),
        take: (_limit === "-1" ? undefined : Number(_limit || 10)),
        orderBy: { createdAt: _order || "desc" }
      }),
      fastify.prisma.transaction.count({ where }),
    ]);

    // Tính toán dữ liệu phân trang
    const pagination = getPaginationData(Number(_page), Number(_limit), totalItems, request.url, startTime);

    // Truy vấn dữ liệu từ bảng transaction
    if (!transaction.length) {
      return reply.status(200).send({
        success: true,
        pagination,
        transactions: [],
      });
    }

    return reply.status(200).send({
      message: "Retrieve data successfully!",
      success: true,
      pagination,
      transactions: transaction,
    });
  } catch (error) {
    console.log("error", error);

    handleErrorResponse(reply, error);
  }
};
