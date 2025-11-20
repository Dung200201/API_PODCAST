import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";

export async function getUserCurrent(
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) {
  try {
    const userId = request?.user?.id;
    const userRole = request?.user?.role;
    const user: any = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          status: userRole ==="ADMIN" ? true : false,
          createdAt: true,
          updatedAt: userRole ==="ADMIN" ? true : false,
          deletedAt: userRole ==="ADMIN" ? true : false,
          profile: {
            select: {
              username: true,
              language: true,
              phone: true,
              company: true,
              apiKey: true,
              role: userRole ==="ADMIN" ? true : false,
              type: userRole ==="ADMIN" ? true : false,
            },
          },
        },
      });
  
    if (!user) {
    return reply.status(404).send({ message: "Account does not exist!" });
    }

    return reply.status(200).send({ 
        message: 'Account information retrieved successfully!', 
        user,
        success: true,
    });
    
  } catch (error:any) {
    console.log(error);
    handleErrorResponse(reply, error);
  }
}
