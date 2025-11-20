import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
import { IParams } from "../../types/generate";
dotenv.config();

export const getGgStackingRequestById = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: IParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const {id:userId, role} = request.user as { id: string, role: string } ;
       const isAdmin =
      (role === "admin") ||
      (role === "dev");
    const ggStacking = await fastify.prisma.googleStackingRequest.findFirst({
      where: !isAdmin ? { id: id, userId  } : { id: id} ,
      select: {
        id: true,
        title: true,
        auction_price: true,
        stacking_connect: true,
        website: true,
        spin_content: true,
        id_tool: true,
        about: true,
        duplicate: true,
        address: true,
        phone: true,
        location: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!ggStacking) {
      return reply.status(404).send({
        message: "Google Stacking not found with the provided ID.",
        success: false,
      });
    }

    // Truy vấn avatar và cover song song
    const [avatar, cover] = await Promise.all([
      fastify.prisma.images.findFirst({
        where: {
          imageableId: ggStacking.id,
          imageableType: 'googleStacking',
          type: 'avatar',
          deletedAt: null,
        },
        select: {
          url: true,
          publicId: true,
        },
        orderBy: { createdAt: 'desc' }, // ảnh mới nhất
      }),
      fastify.prisma.images.findFirst({
        where: {
          imageableId: ggStacking.id,
          imageableType: 'googleStacking',
          type: 'cover',
          deletedAt: null,
        },
        select: {
          url: true,
          publicId: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return reply.status(200).send({
      message: "Google Stacking details fetched successfully.",
      success: true,
      ggStacking:{
        ...ggStacking,
        avatar,
        cover,
      },
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
