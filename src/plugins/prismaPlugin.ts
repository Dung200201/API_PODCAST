import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const prismaPlugin: FastifyPluginAsync = fp(async (server, options) => {
  await prisma.$connect()

  // Make Prisma Client available through the fastify server instance: server.prisma
  server.decorate('prisma', prisma)

  server.addHook('onClose', async (server) => {
    await server.prisma.$disconnect()
  })
})

export { prisma } // Export để sử dụng bên ngoài
export default prismaPlugin

// Use TypeScript module augmentation to declare the type of server.prisma to be PrismaClient
declare module 'fastify' {
    interface FastifyInstance {
      prisma: PrismaClient
    }
}