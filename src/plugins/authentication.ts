import fp from "fastify-plugin";
import { FastifyRequest, FastifyReply } from "fastify";
import { decode } from "next-auth/jwt";

import dotenv from "dotenv";
import { detectLocaleFromBrowser } from "../service/getLanguageDb";
dotenv.config()

// const IS_PRODUCTION = process.env.NODE_ENV ==="production";
// const TOKEN_ADMIN = "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..nlj6JorhPKhVIANe.Xdnmmur4epvHd5LCVRQYiOIrhj8NSeikI0ue4s6juAenHVQFKaMIPdbgo3bqtI_wXUXTW8PnKtoA5JNN-HRyL7c0Wrm6ZNZT6u1xlS25DzkTE5Y1gzyYvhzx7H3HMkU1OZ9Anz5Nl2V9Ky3A6TDuauVJ7KFJiA4YFriayyt-jzzzKyE5CqHLMT6ddV_cmtKOJSnrY8HhjjmP6MQeKF9xTJsjcBMauPqMD9vpr5IRzr0fsCQSKBLCg3L5Gq1y0eVEB7UdljhuzcvdOhDBjcq-y1DIgzZ5eaXI3gJgajImm9LPU5iR3-i7IGvu5Qzj1dOPBWgHlaKh4O5m8EoyuNlel7bejbPx8GlaRg6NEeVjovv7wLRJIz8BejQMlUdYFICQ2GvhkyOaHdJUY8_8uhSMHYDb3gImruM3YkGSSTizkn7xQFQ.zWW2NcTWzaptJxyPzHc0OQ";
// const TOKEN_TEST = "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..1CcjYgqfZw9c_omr.9vSUkI59VWzZVhKKnH5x4k0BIODGRD4Rp9KxZL8bu1CuudgU5StPnzOq5nchmvVJ4evMY8MsKmiFErY3WGNQ4WXVpKgYVs0pbFQ-2RHmfQNIo6Uw0TEfkKRm1UqBMNneFUvsSRXwJPsLR_L_nlb-GzYHnTmJYe-0TygdaPd-XG4t-pWAk53sKeZ4BbSjv2swUs7c2xZHTzYIbIIvzlBjK8OyEcYfkv5rO_R1kRzcGmco9OZoT346sU-NQtopIy39LX_QyTFZxj7jrRuSLjFuySEfBfPfc2mpvqx47pnCbOiUl6YrY-ui5Nej1XGJz2OtVqsKaWHL5k6P9QrIEUKIuOhR_7mCf0xm7XVKFWvDFb0CuJheOYzthyjKKPLzDgB6_7RXLXGm-76NdJHvPZuB3Ox2Kn7o4M2pb14crZRmxd--qQW41DOgtyeV24o.o22c_74K4RJ1zSpkp4qXww";

export default fp(async (fastify) => {
  fastify.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {

      const secret = process.env.JWT_SECRET;
      const token = request.headers.authorization?.split(" ")[1];
      
      if (!secret) {
          console.error("JWT_SECRET is not set");
          process.exit(1);
      }

      if (!token) {
        return reply.status(401).send({
            message: "You are not authenticated",
            send: false
        });
      }
      try {
        const decoded = await decode({ token, secret });
        if (!decoded) {
            return reply.status(403).send({
                message: "Invalid token",
                send: false
            });
        }

        const user: any = await fastify.prisma.user.findUnique({
          where: { id: decoded.sub as any, deletedAt: null },
          select: {
            id: true,
            email: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            deletedAt: true,
            expiresAt: true,
            profile: {
              select: {
                username: true,
                language: true,
                phone: true,
                company: true,
                apiKey: true,
                role: true,
                type: true,
                isVN: true
              },
            },
          },
        });

        if (!user) {
          return reply.status(401).send({ message: "User not found" });
        }

        if(user.profile.language === "auto") user.profile.language = detectLocaleFromBrowser(request);

        // Nếu `decoded.user` đã có đầy đủ thông tin user, gán trực tiếp
        request.user = {
          id: user.id,
          email: user.email,
          expiresAt: user.expiresAt,
          username: user.profile.username,
          role: user.profile.role,
          language: user.profile.language,
          phone: user.profile.phone,
          company: user.profile.company,
          status: user.status,
          type: user.profile.type,
          isVN: user.profile.isVN
        };

        return;
      } catch (err:any) {
        if (err.code === "FAST_JWT_EXPIRED") {
          return reply.status(401).send({ success: false, message: "Expired tokens!" });
        }
        if (err.code === "FAST_JWT_INVALID") {
          return reply.status(401).send({ success: false, message: "Invalid token" });
        }
        return reply.status(401).send({ success: false, message: "Invalid token" });
      }
    }
  );
});

// Khai báo type cho FastifyInstance
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
