import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";

const validTypes = ['MINI', 'SMALL', 'HUGE', 'MEGA'];

export const getAllPackagesTrash = async (
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
      _type = "",
      _order = "desc",
    } = request.query as any;

    if (_type && !validTypes.includes(_type)) {
    return reply.status(400).send({ message: `Invalid type. Valid values: ${validTypes.join(", ")}`, success: false });
    }

    // Tạo điều kiện tìm kiếm trực tiếp
    const where: any = { deletedAt: { not: null} };

    if (_code) where.code = { contains: _code };
    if (_type) where.type = { equals: _type };
    if (_s) {
      where.OR = [
        { name: { contains: _s } },
        { description: { contains: _s } }
      ];
    }

    // Truy vấn dữ liệu từ bảng packages
    const [packages, totalItems] = await Promise.all([
      fastify.prisma.packages.findMany({
        where,
        skip: (_limit === "-1" ? 0 : (Number(_page || 1) - 1) * Number(_limit || 10)),
        take: (_limit === "-1" ? undefined : Number(_limit || 10)),
        orderBy: { updatedAt: _order || "desc" }
      }),
      fastify.prisma.packages.count({ where }),
    ]);

     // Truy vấn dữ liệu từ bảng packages
     if (!packages.length) {
      return reply.status(404).send({ message: "No data found!", success: false });
    }

    // Tính toán dữ liệu phân trang
    const pagination = getPaginationData(Number(_page), Number(_limit), totalItems, request.url, startTime);

    return reply.status(200).send({
      message: "Retrieve data successfully!",
      success: true,
      pagination,
      packages: packages,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
