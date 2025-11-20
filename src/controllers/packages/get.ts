import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export const getPackagesDetailById = async(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    // Lấy id từ params của request
    const { id } = request.params as { id: string };

    // Tìm package trong cơ sở dữ liệu theo id
    const packageDetail = await fastify.prisma.packages.findUnique({
      where: { id: id },
    });
    // Nếu không tìm thấy, trả về thông báo lỗi
    if (!packageDetail) {
      return reply.status(404).send({
        message: "Package not found with the provided ID.",
        success: false,
      });
    }
    // Trả về dữ liệu chi tiết package
    return reply.status(200).send({
      message: "Package details fetched successfully.",
      success: true,
      data: packageDetail,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};

export const getPackagesDetailBySlug = async(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    // Lấy id từ params của request
    const { slug } = request.params as { slug: string };
    // Kiểm tra id hợp lệ hay không
    if (!slug) {
      return reply.status(400).send({
        message: "Invalid slug.",
        success: false,
      });
    }

    // Tìm package trong cơ sở dữ liệu theo id
    const packageDetail = await fastify.prisma.packages.findUnique({
      where: { slug: slug },
    });
    // Nếu không tìm thấy, trả về thông báo lỗi
    if (!packageDetail) {
      return reply.status(404).send({
        message: "Package not found with the provided Slug.",
        success: false,
      });
    }
    // Trả về dữ liệu chi tiết package
    return reply.status(200).send({
      message: "Package details fetched successfully.",
      success: true,
      data: packageDetail,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};