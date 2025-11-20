import { FastifyReply } from "fastify";

export const checkUserStatus = (user: { status: string , deletedAt:string}, reply: FastifyReply) => {
    if (user.status === "banned"  || user.deletedAt !== null) {
      reply.status(403).send({
        message: "Your account has been banned. Please contact support.",
        success: false,
      });
      return false; // Dừng tiếp tục xử lý
    }
    return true; // Cho phép tiếp tục xử lý
};
  