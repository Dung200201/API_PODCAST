import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
dotenv.config();

// Định nghĩa kiểu dữ liệu của request params
interface EntityRequestParams {
  id: string;
}

export const getEntityRequestById = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: EntityRequestParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params as { id: string };
    const { id: userId, role } = request.user as { id: string, role: string };
   const isAdmin = ["admin", "dev"].includes(role);

    const entityRes: any = await fastify.prisma.entityRequest.findUnique({
      where: !isAdmin ? { id: id, userId } : { id: id },
      select: {
        id: true,
        entity_email: true,
        app_password: true,
        id_tool: true,
        auction_price: true,
        entity_limit: true,
        username: true,
        website: true,
        is_delete: true,
        fixed_sites: true,
        account_type: true,
        spin_content: true,
        entity_connect: true,
        social_connect: true,
        first_name: true,
        last_name: true,
        about: true,
        address: true,
        phone: true,
        location: true,
        data: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Nếu không tìm thấy, trả về thông báo lỗi
    if (!entityRes) {
      return reply.status(404).send({
        message: "Entity not found with the provided ID.",
        success: false,
      });
    }

    // Truy vấn avatar và cover song song
    const [avatar, cover] = await Promise.all([
      fastify.prisma.images.findFirst({
        where: {
          imageableId: entityRes.id,
          imageableType: 'entity',
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
          imageableId: entityRes.id,
          imageableType: 'entity',
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

    // Trả về dữ liệu chi tiết indedx
    return reply.status(200).send({
      message: "Entity details fetched successfully.",
      success: true,
      entity: {
        ...entityRes,
        avatar,
        cover,
        data: undefined,
        twofa: entityRes.data?.twofa,
        password: entityRes.data?.password,
      },
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};

export const getEntityRequestCountById = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: EntityRequestParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params as { id: string };
    const { id: userId, role } = request.user as { id: string, role: string };
    const isAdmin = role === "admin";

    const entityRes: any = await fastify.prisma.entityRequest.findUnique({
      where: isAdmin ? { id: id } : { id: id, userId },
      select: {
        entityLinks: true,
        entity_limit: true,
        status: true
      },
    });

    // Nếu không tìm thấy, trả về thông báo lỗi
    if (!entityRes) {
      return reply.status(404).send({
        message: "Entity not found with the provided ID.",
        success: false,
      });
    }

    // Lọc lần 1: link_profile !== ""
    const filteredLinks1 = entityRes.entityLinks.filter((link: any) => link.link_profile !== "");

    // Lọc lần 2: link_profile !== "" && note === "stacking" && link_post !== link_profile
    const filteredLinks2 = entityRes.entityLinks.filter(
      (link: any) => link.link_profile !== "" && link.note === "stacking" && link.link_post !== link.link_profile
    );

    // Gộp hai mảng lại nhưng loại bỏ trùng lặp bằng Set
    const uniqueLinks = new Set([...filteredLinks1, ...filteredLinks2]);

    const entityLinks = uniqueLinks.size; // Số lượng link sau khi gộp mà không trùng lặp
    const ratio = entityRes.entity_limit > 0 ? (entityLinks / entityRes.entity_limit) * 100 : 0; // Tính đúng tỉ lệ

    // Trả về dữ liệu chi tiết indedx
    return reply.status(200).send({
      success: true,
      status: entityRes.status,
      entityLinks: entityLinks,
      entity_limit: entityRes.entity_limit,
      ratio: Number(ratio.toFixed(0))
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};