import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ISocialAccountUpdate } from "../../types/social";
import { updateAccountSchema } from "../../schema/social_account";
import { IParams } from "../../types/generate";
import { Role } from "@prisma/client";

export const updateSocialAccount = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: IParams; Body: ISocialAccountUpdate }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params as {id: string};
    const {role} = request.user as {role: Role}
    const formData = request.body as any;

    // validate
    const validation: any = updateAccountSchema.safeParse({ ...formData, id });
    if (!validation.success) {
      const allErrors = validation.error.errors.map((err: any) => err.message).join(", ");
      return reply.status(400).send({ message: allErrors });
    }

    // 2. Kiểm tra xem group Id (Điều kiện k bị xoá mềm, trạng thái phải là new, completed)
    const socialAccountExists: any = await fastify.prisma.socialAccount.findFirst({
      where: { id: validation.data.id, deletedAt: null },
    });

    if (role !== "admin" && role !== "dev") {
      if (!socialAccountExists) {
        return reply.status(400).send({
          message: "The data does not exist or has been deleted! Please try again after verifying the information",
        });
      }
      if (socialAccountExists.status ==="checking") {
        return reply.status(400).send({
          message: "Data is being processed. Please try again later",
        });
      }
    }

    // check xem có dữ liệu của khách có sửa gì mới so với dữ liệu cũ k
    const existingData = socialAccountExists as { [key: string]: string }; // Ensuring TypeScript understands it's a record

    const hasChanges = Object.keys(formData).some(
      (key) => formData[key] !== existingData[key] // Access properties safely
    );

    if (!hasChanges) {
      return reply.status(200).send({
        message: "Update data successfully!",
        success: true,
        socialAccount: socialAccountExists, // Return the existing data
      });
    }

    // 2. Kiểm tra xem group Id (Điều kiện k bị xoá mềm, trạng thái phải là new, completed)
    const socialGroupExists: any = await fastify.prisma.socialGroup.findFirst({
      where: { id: validation.data.socialGroupId, deletedAt: null, status: { in: ["new", "completed"] } },
      select: {
        id: true,
      }
    });
    if (!socialGroupExists) {
      return reply.status(400).send({
        message: "The specified group does not exist or has been deleted. Please check the information and try again",
      });
    }

    const dataReq:any = {
      ...formData,
      id,
      status: "uncheck",
    };

    const updated = await fastify.prisma.socialAccount.update({
      where: { id },
      data: dataReq
    })

    return reply.status(200).send({
      message: "Update data successfully!",
      success: true,
      socialAccount: updated,
    });
  } catch (error) {
    console.error(error);
    handleErrorResponse(reply, error);
  }
};