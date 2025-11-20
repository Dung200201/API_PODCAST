import fp from "fastify-plugin";
import { FastifyRequest, FastifyReply } from "fastify";

import dotenv from "dotenv";
dotenv.config()

export default fp(async (fastify) => {
  fastify.decorate(
    "apiKeyAuth",
    async function (request: FastifyRequest, reply: FastifyReply) {

      // check apikey
      const apiKey = request.headers["x-api-key"];

      if (!apiKey || Array.isArray(apiKey)) {
        return reply.code(401).send({ message: "You are not authenticated" });
      }

      // Nếu client dùng API Key
      if (apiKey) {

        const profile: any = await fastify.prisma.profile.findUnique({
          where: { apiKey: apiKey },
          select: {
            user: {
              select: {
                id: true,
                email: true,
                status: true,
                transactions: true
              }
            },
            role: true,
            type: true,
            language: true,
            username: true,
            phone: true,
            company: true,
          }
        });

        if (!profile || !profile.user || profile.user.deletedAt || ["banned", "pending"].includes(profile.user.status)) {
          return reply.code(403).send({ message: "Invalid or inactive user for API key", success: false });
        }

        const totalPoints =
          profile.user.transactions?.reduce((sum: number, transaction: any) => {
            const points = Number(transaction.points) || 0;
            return sum + (transaction.type === "debit" ? -points : points);
          }, 0) || 0;
        request.user = {
          id: profile.user.id,
          email: profile.user.email,
          username: profile.username,
          type: profile.type,
          role: profile.role,
          language: profile.language || "auto",
          phone: profile.phone,
          company: profile.company,
          points: totalPoints,
          source: "api"
        };
        return;
      }
    }
  );
});

// Khai báo type cho FastifyInstance
declare module "fastify" {
  interface FastifyInstance {
    apiKeyAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}