// utils/userActionLog.ts
import { FastifyInstance, FastifyRequest } from 'fastify';
import {  UserActionTable, Prisma } from '@prisma/client';

interface CreateLogParams {
  fastify: FastifyInstance;
  request: FastifyRequest;
  action: string;
  resource?: UserActionTable;
  resourceId?: string;
  metadata?: Record<string, any>;
}

export const createUserActionLog = async ({
  fastify,
  request,
  action,
  resource,
  resourceId,
  metadata,
}: CreateLogParams) => {
  try {
    const userId = (request.user as any)?.id;

    const log = await fastify.prisma.userActionLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull, // ✅ Fix here
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
      },
    });

    return log;
  } catch (error) {
    // Log error nhưng không throw để không ảnh hưởng luồng chính
    console.error('❌ Failed to create user action log:', error);
    return null;
  }
};