import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
// import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient, Profile } from '@prisma/client';

/**
 * This plugin a JWT utils for Fastify
 *
 * @see https://github.com/fastify/fastify-jwt
 */
export default fp(async (fastify) => {
  fastify.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { algorithm: 'HS256' },
    cookie: {
      cookieName: "__Host-session-token",
      signed: false,
    },
  });
});

// Use TypeScript module augmentation to declare the type of server.authenticate
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    authenticateApiKey: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    prisma: PrismaClient
  }

  interface FastifyRequest {
    profile?: Profile;
  }
}
