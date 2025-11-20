import { updateCreditSchemas } from "../../schema/credit";
import { ICredit } from "../../types/credit";
import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

interface Params {
  id: string;
}

export const updateCredit = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) => {
  try {
    const formData = request.body as ICredit;
    const idPk = request.params.id

    // Validate request body
    const checkValidate:any = updateCreditSchemas.safeParse(formData);
    
    if (!checkValidate.success) {
      const allErrors = checkValidate.error.errors.map((err:any) => err.message).join(', ');
      return reply.status(400).send({
        message: allErrors,
      });
    }

    // 🔥 Chạy 2 truy vấn song song
    const [currentData, userExists] = await Promise.all([
      fastify.prisma.credit.findUnique({
        where: { id: idPk },
        select: {  name: true, description: true },
      }),
      fastify.prisma.user.findUnique({
        where: { id: formData.userId },
      }),
    ]);

    // ❌ Kiểm tra nếu không tìm thấy dữ liệu
    if (!currentData) {
      return reply.status(404).send({
        message: "Credit package not found.",
        success: false,
      });
    }

    if (!userExists) {
      return reply.status(400).send({
        message: "User not found. Please provide a valid userId.",
        success: false,
      });
    }

    // 🔍 Kiểm tra dữ liệu có thay đổi không
    if (
      currentData.name === formData.name &&
      currentData.description === formData.description
    ) {
      return reply.status(200).send({
        message: "No changes detected. Data remains the same.",
        success: true,
      });
    }

    // 🛠 Kiểm tra xem name đã tồn tại chưa (ngoại trừ gói hiện tại)
    const existingName = await fastify.prisma.credit.findFirst({
      where: {
        name: formData.name,
        NOT: { id: idPk },
      },
    });

    if (existingName) {
      return reply.status(400).send({
        message: "Name already exists. Please use a unique Name.",
        success: false,
      });
    }

    // ✅ Chạy cập nhật dữ liệu
    const updatedPackage = await fastify.prisma.credit.update({
      where: { id: idPk },
      data: {
        name: formData.name,
        description: formData.description,
      },
    });

    return reply.status(200).send({
      message: "Update data successfully!",
      success: true,
      credit: updatedPackage,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};