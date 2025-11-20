import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

// Trong route hoặc middleware
export async function authenticateCsrf(
    fastify: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const csrfTokenFromHeader = request.headers['x-csrf-token'] ;
    const csrfTokenFromCookie = request.cookies['__Host-next-auth.csrf-token'];
  
    if (!csrfTokenFromHeader || !csrfTokenFromCookie || csrfTokenFromHeader !== csrfTokenFromCookie) {
      reply.status(403).send({ error: 'CSRF token mismatch' });
      return;
    }
}