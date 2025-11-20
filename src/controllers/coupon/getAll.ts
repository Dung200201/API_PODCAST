import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";

const validTypes = ["INCREASE", "DISCOUNT", "REWARD"];

export const getAllCoupon = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const startTime = Date.now(); // Lưu thời gian request bắt đầu
    const {
      _s = "",
      _page = 1,
      _limit = 10,
      _code = "",
      _order = "desc",
      _couponType = "",
    } = request.query as any;

    if (_couponType && !validTypes.includes(_couponType)) {
      return reply.status(400).send({ message: `Invalid type. Valid values: ${validTypes.join(", ")}`, success: false,});
    }

    // Tạo điều kiện tìm kiếm trực tiếp
    const where: any = { deletedAt: null };

    if (_code) where.code = { contains: _code };
    if (_couponType) where.couponType = { equals: _couponType };
    if (_s) {
      where.OR = [
        { description: { contains: _s } }
      ];
    }

    // Truy vấn dữ liệu
    const [data, totalItems] = await Promise.all([
      fastify.prisma.coupon.findMany({
        where,
        skip: (_limit === "-1" ? 0 : (Number(_page || 1) - 1) * Number(_limit || 10)),
        take: (_limit === "-1" ? undefined : Number(_limit || 10)),
         orderBy: { updatedAt: _order === "asc" ? "asc" : "desc" },
      }),
      fastify.prisma.coupon.count({ where }),
    ]);

    // Nếu không có dữ liệu tìm thấy
    if (!data || data.length === 0) {
      return reply.status(404).send({ message: "No data found!", success: false });
    }
    
    // Tính toán phân trang
    const pagination = getPaginationData(Number(_page), Number(_limit), totalItems, request.url, startTime);
    

    return reply.status(200).send({
      message: "Retrieve data successfully!",
      success: true,
      pagination,
      coupons: data,
    });
  } catch (error) {
    console.log(error);

    handleErrorResponse(reply, error);
  }
};
