import fp from 'fastify-plugin'
import path from 'path'
import fastifyStatic from '@fastify/static'

/**
 * Serve static files for API documentation under a custom route
 *
 * @see https://github.com/fastify/fastify-static
 */
export default fp(async (fastify) => {
    const docsPath = path.join(__dirname, '../../src/docs');
    fastify.register(fastifyStatic, {
      root: docsPath, 
      prefix: '/docs/',
      index: false,
      decorateReply: false, 
    })

  fastify.setErrorHandler((error, request, reply) => {
    if (error.statusCode === 404) {
      reply.code(404).send({ message: 'File not found' })
    } else {
      reply.send(error)
    }
  })
})