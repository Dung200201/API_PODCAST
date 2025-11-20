import fp from "fastify-plugin";
import { FastifyRequest, FastifyReply } from "fastify";

export default fp(async (fastify) => {
  fastify.decorate(
    "authorize",
    function (roles: string[]) {
      return async function (request: FastifyRequest | any, reply: FastifyReply) {
        if (!request.user) {
          return reply.code(403).send({ message: "Forbidden: No user found" });
        }

        if (!roles.includes(request.user.role)) {
          return reply.code(403).send({ message: "Forbidden: Insufficient permissions" });
        }
      };
    }
  );
});

// Khai báo type cho FastifyInstance
declare module "fastify" {
  interface FastifyInstance {
    authorize: (roles: string[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
