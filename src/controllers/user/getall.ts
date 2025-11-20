import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";
import { calculateTotalPoints } from "../../utils/calculateTotalPoints";
import { getVNTimeNow } from "../../utils/getVNTimeNow";

const validStatus = ["active", "banned", "pending"];
const validRoles = ["user", "support", "dev", "admin"];
const validTypes = ["normal", "advanced", "priority"];

export const getAllUser = async (
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
      _expireAt = "",
      _start_date = "",
      _end_date = "",
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

    const validExpireAt = ["active", "expired"];
    if (_expireAt && !validExpireAt.includes(_expireAt)) {
      return reply.status(400).send({
        message: `Invalid _expireAt. Valid values: ${validExpireAt.join(", ")}`,
        success: false,
      });
    }

    // **2. Tạo điều kiện tìm kiếm**
    const where: any = { deletedAt: null, domains: "likepion" };


    if (_status) where.status = { equals: _status };
    if (_role) where.profile = { role: { equals: _role } };
    if (_type) where.profile = { ...where.profile, type: { equals: _type } };

    if (_s) {
      where.OR = [
        { email: { contains: _s } },
        { profile: { username: { contains: _s } } }
      ];
    }

    if (_expireAt === "active") {
      // Còn hạn: expiresAt > hiện tại hoặc expiresAt == null (vô hạn)
      where.OR = [
        { expiresAt: { gt: getVNTimeNow() } },
        { expiresAt: null }
      ];
    } else if (_expireAt === "expired") {
      // Hết hạn: expiresAt <= hiện tại và expiresAt != null
      where.AND = [
        { expiresAt: { lte: getVNTimeNow() } },
        { expiresAt: { not: null } }
      ];
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

    // **3. Truy vấn dữ liệu từ bảng user**
    const [users, totalItems] = await Promise.all([
      fastify.prisma.user.findMany({
        where,
        skip: (_limit === "-1" ? 0 : (Number(_page) - 1) * Number(_limit)),
        take: (_limit === "-1" ? undefined : Number(_limit)),
        orderBy: { createdAt: _order || "desc" },
        select: {
          email: true, 
          id: true, 
          status: true, 
          expiresAt: true,
          createdAt: true, 
          profile: {
            select: {
              username: true,
              phone: true,
              role: true,
              type: true
            }
          }, // Lấy toàn bộ profile (hoặc bạn có thể select fields cụ thể trong profile nếu muốn)
          transactions: {
            where: { deletedAt: null },
            select: { points: true, type: true },
          },
        },
      }),
      fastify.prisma.user.count({ where }),
    ]);

    // **5. Tính toán phân trang**
    const pagination = getPaginationData(Number(_page), Number(_limit), totalItems, request.url, startTime);

    // Nếu không có dữ liệu
    if (!users || users.length === 0) {
      return reply.status(200).send({
        success: true,
        pagination,
        users: [],
      });
    }

    const usersWithPoints = users.map((user: any) => {
      const totals = calculateTotalPoints(user.transactions);
      const daysLeft = calculateDaysLeft(user.expiresAt);
      return {
        ...user,
        ...totals,
        expiresAt:daysLeft
      };
    });

    return reply.status(200).send({
      message: "Retrieve data successfully!",
      success: true,
      pagination,
      users: usersWithPoints,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};

function calculateDaysLeft(expiresAt: Date | null): number | null {
  if (!expiresAt) return null;
  const now = getVNTimeNow(); // Lấy thời gian hiện tại ở VN
  const diff = expiresAt.getTime() - now.getTime();
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
}