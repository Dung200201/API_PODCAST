import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
dotenv.config();

// Định nghĩa kiểu dữ liệu của request params
interface IndexRequestParams {
  id: string;
}

export const getIndexLinkById = async(
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: IndexRequestParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params as { id: string };
    const {id:userId} = request.user as { id: string };

    const indexRes:any = await fastify.prisma.indexLink.findFirst({
      where: {
        id: id,
        indexRequest: {
          userId: userId, // Đảm bảo chỉ lấy dữ liệu có userId khớp
        },
      },
      select: {
        id: true,
        indexRequest: {  
          select: {
            id: true,
            userId: true, 
          },
        },
        source: true,
        url: true,
        response: true,
        information: true,
        push: true,
        status: true,
        indexed: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Nếu không tìm thấy, trả về thông báo lỗi
    if (!indexRes) {
      return reply.status(404).send({
        message: "Index not found with the provided ID.",
        success: false,
      });
    }

    indexRes.deletedAt = undefined;

    // Trả về dữ liệu chi tiết indedx
    return reply.status(200).send({
      message: "Index link details fetched successfully.",
      success: true,
      index: indexRes,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};