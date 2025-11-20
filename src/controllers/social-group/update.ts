import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { IParams } from "../../types/generate";
import { updateSocialGroupSchema } from "../../schema/social_group";
import { handleErrorResponse } from "../../utils/handleError";

export const updateSocialGroup = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: IParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const formData: any = request.body;

    // Validate input
    const result = updateSocialGroupSchema.safeParse({ ...formData, id });
    if (!result.success) {
      const errorMessage = result.error.errors.map((err) => err.message).join(", ");
      return reply.status(400).send({ message: errorMessage });
    }

    // Check if the social group exists
    const existing = await fastify.prisma.socialGroup.findUnique({
      where: { id },
      select: { id: true, name: true, status: true }, // specify the fields you're interested in
    });

    if (!existing) {
      return reply.status(404).send({
        message: "The data does not exist or has been deleted! Please try again after verifying the information.",
        success: false,
      });
    }

    // check xem có dữ liệu của khách có sửa gì mới so với dữ liệu cũ k
    const existingData = existing as { [key: string]: string }; // Ensuring TypeScript understands it's a record

    const hasChanges = Object.keys(formData).some(
      (key) => formData[key] !== existingData[key] // Access properties safely
    );

    if (!hasChanges) {
      return reply.status(200).send({
        message: "Update data successfully!",
        success: true,
        socialGroup: existing, // Return the existing data
      });
    }

    const dataReq = {
      ...formData,
      id,
    };

    const updated = await fastify.prisma.socialGroup.update({
      where: { id },
      data: dataReq,
    });

    return reply.status(200).send({
      message: "Update data successfully!",
      success: true,
      socialGroup: updated,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
