import fp from 'fastify-plugin'
import rateLimit, { FastifyRateLimitOptions } from '@fastify/rate-limit'

/**
 * This plugin a low overhead rate limiter for your routes
 *
 * @see https://github.com/fastify/fastify-rate-limit
 */
export default fp<FastifyRateLimitOptions>(async (fastify) => {
  fastify.register(rateLimit, {
    keyGenerator: (request:any) => {
      return request.ip || request.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    },
  });
  // fastify.register(rateLimit, {
  //   max: 10,
  //   timeWindow: 1000 //per second
  // })

  // fastify.setErrorHandler(function (error, request, reply) {
  //   if (error.statusCode === 429) {
  //     reply.code(429)
  //     error.message = 'Hold on! You hit the limit. Slow down please!'
  //   }
  //   reply.send(error)
  // })
})