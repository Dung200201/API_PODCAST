import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    spinText: (text: string) => string;
  }
}
