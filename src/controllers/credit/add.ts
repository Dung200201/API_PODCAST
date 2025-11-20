import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { ICredit } from "../../types/credit";
import { createCreditSchemas } from "../../schema/credit";
import { v7 as uuidv7 } from 'uuid';

export const createCredit = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const formData = request.body as ICredit;

    // Validate request body
    const checkValidate: any = createCreditSchemas.safeParse(formData);

    if (!checkValidate.success) {
      const allErrors = checkValidate.error.errors.map((err: any) => err.message).join(', ');
      return reply.status(400).send({
        message: allErrors,
      });
    }

    // Kiểm tra xem tên đã tồn tại chưa
    const existingName = await fastify.prisma.credit.findUnique({
      where: { name: formData.name } as any,
    });

    if (existingName) {
      return reply.status(400).send({
        message: "Name already exists. Please use a unique Name.",
        success: false,
      });
    }

    const newData = await fastify.prisma.$transaction(async (prisma: any) => {
      const data = await prisma.credit.create({
        data: {
          id: uuidv7(),
          user: {
            connect: { id: formData.userId },
          },
          name: formData.name.toUpperCase().trim(),
          description: formData.description,
        },
      });
      return data;
    });

    return reply
      .status(200)
      .send({ message: "Created data successfully!", success: true, newData });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
