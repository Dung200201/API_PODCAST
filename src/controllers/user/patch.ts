import { IUser } from "../../types/user";
import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

interface Params {
    id: string;
}

export const patchUser = async (
    fastify: FastifyInstance,
    request: FastifyRequest<{ Params: Params }>,
    reply: FastifyReply
  ) => {
    try {
    const id = request.params.id

    if (!id) {
        return reply.status(400).send({ message: "User ID is required.", success: false });
    }

    const formData = request.body as Partial<IUser>;
    const { status, ...profileData }: any = formData;
  
    // Check if user exists
    const user:any = await fastify.prisma.user.findUnique({
        where: { id, deletedAt: null  },
        include: { profile: true }, 
    });
  
    if (!user) {
        return reply.status(404).send({ message: "User not found.", success: false });
    }

    // Chỉ cập nhật những giá trị có trong `formData`
    const updateUserData: any = {};
    if (status !== undefined) updateUserData.status = status;

    const updateProfileData: any = {};
    Object.assign(updateProfileData, profileData); // Chỉ lấy giá trị hợp lệ

    // Use transaction to update user and profile at the same time
    await fastify.prisma.$transaction([
        fastify.prisma.user.update({
            where: { id },
            data: { status },
        }),
        fastify.prisma.profile.update({
            where: { userId: id },
            data: updateProfileData ,
        }),
    ]);

    // Return the updated user object with profile included
    return reply.status(200).send({
        message: "Update data successfully!",
        success: true,
    });
  
    } catch (error) {
      console.log(error);
      handleErrorResponse(reply, error);
    }
};
  
