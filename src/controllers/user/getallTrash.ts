import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";

const validStatus = ["ACTIVE", "BANNED"];
const validRoles = ["USER", "SUPPORT", "DEV", "ADMIN"];
const validTypes = ["NORMAL", "ADVANCED", "PRIORITY"];

export const getAllUserTrash = async (
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
      _status = "",
      _role = "",
      _type = "",
      _order = "desc",
    } = request.query as any;

    // check đầu vào lọc dữ liệu
    if (_status && !validStatus.includes(_status)) {
    return reply.status(400).send({ message: `Invalid status. Valid values: ${validStatus.join(", ")}`, success: false });
    }

    if (_role && !validRoles.includes(_role)) {
    return reply.status(400).send({ message: `Invalid role. Valid values: ${validRoles.join(", ")}`, success: false });
    }

    if (_type && !validTypes.includes(_type)) {
    return reply.status(400).send({ message: `Invalid type. Valid values: ${validTypes.join(", ")}`, success: false });
    }

    // **2. Tạo điều kiện tìm kiếm**
    const where: any = { deletedAt: {not: null} };

    if (_status) where.status = { equals: _status };
    if (_role) where.profile = { role: { equals: _role } };
    if (_type) where.profile = { ...where.profile, type: { equals: _type } };

    if (_s) {
      where.OR = [
        { email: { contains: _s } },
        { profile: { username: { contains: _s } } }
      ];
    }

    // **3. Truy vấn dữ liệu từ bảng user**
    const [users, totalItems] = await Promise.all([
      fastify.prisma.user.findMany({
        where,
        include: { profile: true },
        skip: (_limit === "-1" ? 0 : (Number(_page) - 1) * Number(_limit)),
        take: (_limit === "-1" ? undefined : Number(_limit)),
        orderBy: { updatedAt: _order || "desc" }
      }),
      fastify.prisma.user.count({ where }),
    ]);

    // Nếu không có dữ liệu
    if (!users || users.length === 0) {
      return reply
        .status(404)
        .send({ message: "No data found!", success: false });
    }

    // **5. Tính toán phân trang**
    const pagination = getPaginationData(Number(_page), Number(_limit), totalItems, request.url, startTime);

    return reply.status(200).send({
      message: "Retrieve data successfully!",
      success: true,
      pagination,
      users,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};