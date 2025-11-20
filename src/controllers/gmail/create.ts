import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { v7 as uuidv7  } from "uuid";

import { createGmailSchema } from "../../schema/gmail";

export const createGmail = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    // Validate input
    const formData = createGmailSchema.parse(request.body);

    // 1. Validate input
    const insertData = formData.data.map((item:any) => ({
        id: uuidv7(),
        email:item.email,
        password:item.password,
        app_password:item.app_password,
        secret_key:item.secret_key,
        recovery_email:item.recovery_email,
        owner:item.owner,
        status:item.status,
    }));

    // Chèn danh sách URL vào database
    const newRequest = await fastify.prisma.gmail.createMany({
        data: insertData,
        skipDuplicates: true,
    });

    fastify.log.info("Đẩy lên thành công")

    // 7. Return response
    return reply.status(201).send({
      success: true,
      message: "Create success",
      gmail: newRequest,
    });
  } catch (error) {
    console.log("error", error);
    
    handleErrorResponse(reply, error);
  }
};