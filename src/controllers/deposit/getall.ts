import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";
import dotenv from "dotenv";
import { depositQuerySchema } from "../../schema/deposit";
dotenv.config();

export const getAllDeposit = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const { id: userId, role, isVN } = request.user as { id: string; role: string; isVN: boolean };

    const startTime = Date.now(); // Lưu thời gian request bắt đầu
    const queryParams = depositQuerySchema.parse(request.query);
    const {
      _s = "",
      _page = 1,
      _limit = 10,
      _order = "desc",
      _start_date,
      _end_date,
      _status = "",
      _role = "",
      _type_package = "",
      _code,
    } = queryParams as any;

    const isAdmin = role === "admin" && _role === "admin";

    //kiểm tra lấy dữ liệu
    const userExists = await fastify.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    // check user
    if (!userExists) {
      return reply.status(400).send({
        message: "User not found. Please provide a valid userId.",
        success: false,
      });
    }

    let languageData = request.headers["accept-language"].startsWith("vi") ? "vi" : "en";
    const isVietnamese = languageData === "vi" || isVN;

    // Tạo điều kiện tìm kiếm trực tiếp
    const where: any = { deletedAt: null, domains: "likepion" };

    if (_s) {
      where.OR = [
        { order_code: { contains: _s } },
        { user: { email: { contains: _s } } },
      ];
    }

    if (_type_package) {
      where.package = {
        is: {
          type: _type_package,
        },
      };
    } ``

    if (_status) {
      where.status = { in: Array.isArray(_status) ? _status : [_status] };
    }
    if (_code) {
      where.OR = [
        { order_code: { contains: _code } },
      ];
    }

    // Check quyền admin
    if (!isAdmin) where.userId = { equals: userId };

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

    // Truy vấn dữ liệu từ bảng deposit
    const [deposit, totalItems] = await Promise.all([
      fastify.prisma.deposit.findMany({
        where,
        select:
          isAdmin ? {
            id: true,
            updatedAt: true,
            status: true,
            money_vnd: true,
            quantity: true,
            order_code: true,
            user: {
              select: {
                email: true,
              },
            },
            credit: {
              select: {
                name: true,
              },
            },
            transaction: {
              select: {
                points: true
              }
            },
            currency: true,
            package: {
              select: {
                type: true,
                points: true,
                ...isVietnamese ? { price_usd: true, price_vnd: true } : { price_usd: true }
              },
            },
          }
            : {
              id: true,
              user: {
                select: {
                  id: true,
                  profile: {
                    select: {
                      language: true,
                    },
                  },
                },
              },
              quantity: true,
              package: {
                select: {
                  id: true,
                  ...isVietnamese ? { price_usd: true, price_vnd: true } : { price_usd: true }
                },
              },
              credit: true,
              order_code: true,
              money_vnd: true,
              status: true,
              updatedAt: true,
            },
        skip: (_limit === "-1" ? 0 : (Number(_page || 1) - 1) * Number(_limit || 10)),
        take: (_limit === "-1" ? undefined : Number(_limit || 10)),
        orderBy: { updatedAt: _order || "desc" }
      }),
      fastify.prisma.deposit.count({ where }),
    ]);

    // Tính toán dữ liệu phân trang
    const pagination = getPaginationData(
      Number(_page),
      Number(_limit),
      totalItems,
      request.url,
      startTime
    );

    // Truy vấn dữ liệu từ bảng deposit
    if (!deposit.length) {
      return reply.status(200).send({
        success: true,
        pagination,
        deposits: [],
      });
    }

    // Xử lý danh sách deposit
    const depositWithVietnamTime = deposit.map((d: any) => {
      let total = 0;
      let currency;
      let points = 0;

      // Kiểm tra creditId
      if (d.credit) {
        if (d.credit.name === "qrcode") {
          if (d.status === "new") {
            total = d.quantity * d.package?.price_vnd;
          } else {

            total = d.money_vnd
          }
          currency = "vnđ"
        } else if (d.credit.name === "bank transfer") {
          total = d.money_vnd;
          currency = "vnd";
          if (d.transaction) {
            points = d.transaction.points || 0
          }
        } else {
          if (isAdmin) {
            total = d.quantity * d.package?.price_usd;
            currency = "usd"
          } else {
            currency = isVietnamese ? "vnđ" : "usd"
            if (d.status == "new") {
              total = d.quantity * (isVietnamese ? d.package?.price_vnd : d.package?.price_usd);
            } else {
              total = d.money_vnd
            }
          }
        }
      } else {
        currency = isVietnamese ? "vnđ" : "usd"

        // Nếu không có creditId, tính dựa trên ngôn ngữ người dùng
        if (d.status == "new") {
          total = d.quantity * (isVietnamese ? d.package?.price_vnd : d.package?.price_usd);
        } else {
          total = d.money_vnd
        }
      }

      const updatedAt = new Date(d.updatedAt);  // d.updatedAt là một đối tượng Date từ Prisma
      updatedAt.setHours(updatedAt.getHours() + 24);
      const due_date = updatedAt.toISOString();

      return { ...d, total, due_date, currency, points };
    });

    return reply.status(200).send({
      message: "Retrieve data successfully!",
      success: true,
      pagination,
      deposits: depositWithVietnamTime,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
