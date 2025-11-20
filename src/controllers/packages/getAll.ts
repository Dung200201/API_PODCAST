import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";
import dotenv from "dotenv";
dotenv.config();

const validTypes = ['mini', 'small', 'huge', 'mega'];

export const getAllPackages = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
    const id = request.user.id;
     const { isVN } = request.user as { id: string; role: string; isVN: boolean };
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

    // Tìm user trong cơ sở dữ liệu theo id
    const user: any = await fastify.prisma.user.findUnique({
      where: { id: id },
      include: { profile: true },
    });

    // Nếu không tìm thấy, trả về thông báo lỗi
    if (!user) {
      return reply.status(404).send({
        message: "Account not found with the provided ID.",
        success: false,
      });
    }

    let languageData = request.headers["accept-language"].startsWith("vi") ? "vi" : "en";
    const isVietnamese = languageData === "vi" || isVN;

    // Tạo điều kiện tìm kiếm trực tiếp
    const where: any = { deletedAt: null };

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
        select: {
          id: true,
          type: true,
          description: true,
          durationDays: true,
          points: true,
          isActive: true,
          ...(isVietnamese ? { price_vnd: true } : { price_usd: true }), // Trả về giá theo ngôn ngữ
        },
        skip: (_limit === "-1" ? 0 : (Number(_page || 1) - 1) * Number(_limit || 10)),
        take: (_limit === "-1" ? undefined : Number(_limit || 10)),
        orderBy: { updatedAt: _order || "desc" }
      }),
      fastify.prisma.packages.count({ where }),
    ]);

    // Truy vấn dữ liệu từ bảng packages
    if (!packages.length) {
      return reply.status(200).send([]);
    }

    const packagesFilter = packages.map((pkg) => {
      return {
        ...pkg, // Spread each package object
        name: undefined,
        userId: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        isActive: undefined,
      };
    });

    // Tính toán dữ liệu phân trang
    const pagination = getPaginationData(Number(_page), Number(_limit), totalItems, request.url, startTime);

    return reply.status(200).send({
      message: "Retrieve data successfully!",
      success: true,
      pagination,
      packages: packagesFilter,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
