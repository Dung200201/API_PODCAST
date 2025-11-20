import { FastifyPluginAsync } from 'fastify'

const api_root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    return { "ScapBot API": "Always keep your apiKey secure" }
  })
}

export default api_root;