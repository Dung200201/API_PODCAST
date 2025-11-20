import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { clearAccessTokenCookies } from "./clearCookies";

export async function getSession(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const token =
      request.headers["authorization"]?.replace("Bearer ", "") ||
      request.cookies["session-token"];

    if (!token) {
      return reply.status(200).send({token: token}); 
    }

    const decoded:any = await fastify.jwt.verify(token);

    // 🔥 Truy vấn DB để lấy thông tin user chính xác hơn
    const user:any = await fastify.prisma.user.findUnique({
      where: { id: decoded.id },
      select: { 
          id: true, 
          email: true,
          status:true, 
          deletedAt: true,
          transactions: {
            select: {
              points: true,
              type: true
            }
          },
          profile: {
            select: {
              role: true,
              type: true,
              language: true,
              username: true,
              phone: true,
              company: true,
            }
          } 
        },
    });

    if (!user) {
      return reply.status(401).send({ success: false, message: "User not found" });
    }

    // check tài khoản bị band
    if (user.status === "banned") {
      return reply.status(403).send({ success: false, message: "User is banned" });
    }

    // check tài khaonr bị xoá
    if (user.deletedAt) {
      return reply.status(401).send({ success: false, message: "User is deleted" });
    }

    // ⚡ Tính tổng điểm dựa vào transactions
    const totalPoints = user.transactions.reduce((sum: number, transaction: any) => {
      const points = Number(transaction.points) || 0;
      return sum + (transaction.type === "debit" ? -points : points);
    }, 0);
    user.username = user.profile.username;
    user.role = user.profile.role;
    user.transactions = undefined;
    user.profile = undefined;
    // user.role = user.profile.role;

    return reply.status(200).send({
      user: user,
      points: totalPoints,
      success: true
    }); 
  } catch (error:any) {
    if (error.code === "FAST_JWT_EXPIRED") {
      clearAccessTokenCookies(reply);
      return reply.status(401).send({ success: false, message: "Expired tokens!" });
    }
    if (error.code === "FAST_JWT_INVALID") {
      clearAccessTokenCookies(reply);
      return reply.status(401).send({ success: false, message: "Invalid token" });
    }
    return reply.code(401).send({ message: "Unauthorized" });
  }
}
