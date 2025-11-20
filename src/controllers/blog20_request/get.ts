import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ImageableType } from "@prisma/client"; //  dùng enum gốc Prisma
import dotenv from "dotenv";
dotenv.config();

interface Blog20RequestParams {
  id: string;
}

export const getBlog20RequestById = async (
  fastify: FastifyInstance, request: FastifyRequest<{ Params: Blog20RequestParams }>, reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const { id: userId, role } = request.user as { id: string; role: string };
    const isAdmin = role === "admin" || role === "dev";

    const blogRes = await fastify.prisma.blog20Request.findUnique({
      where: !isAdmin ? { id, userId } : { id },
      select: {
        id: true,
        name: true,
        data: true,
        id_tool: true,
        blogGroupId: true,
        userId: true,
        auction_price: true,
        typeRequest: true,
        status: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        blog20group: {
          select: { id: true, name: true },
        },
      },
    });

    if (!blogRes) {
      return reply.status(404).send({
        message: "Blog request not found with the provided ID.",
        success: false,
      });
    }

    // ✅ Lấy avatar và cover từ bảng Images, dùng enum chính xác 
    const [avatar, cover] = await Promise.all([
      fastify.prisma.images.findFirst({
        where: {
          imageableId: blogRes.id,
          imageableType: ImageableType.blog20, // <— dùng enum chính xác
          type: "avatar",
          deletedAt: null,
        },
        select: { url: true, publicId: true },
        orderBy: { createdAt: "desc" },
      }),
      fastify.prisma.images.findFirst({
        where: {
          imageableId: blogRes.id,
          imageableType: ImageableType.blog20,
          type: "cover",
          deletedAt: null,
        },
        select: { url: true, publicId: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return reply.status(200).send({
      message: "Blog20Request details fetched successfully.",
      success: true,
      blog: {
        ...blogRes,
        avatar,
        cover,
      },
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};

// Get chi tiết trả về số link hoặc số account
export const getBlog20RequestDetailsById = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: Blog20RequestParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const { id: userId, role } = request.user as { id: string; role: string };
    const isAdmin = role === "admin" || role === "dev";

    const blogRes = await fastify.prisma.blog20Request.findUnique({
      where: !isAdmin ? { id, userId } : { id },
      select: {
        id: true,
        name: true,
        data: true,
        id_tool: true,
        blogGroupId: true,
        userId: true,
        auction_price: true,
        typeRequest: true,
        status: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        blog20group: {
          select: { id: true, name: true },
        },
      },
    });

    if (!blogRes) {
      return reply.status(404).send({
        message: "Blog request not found with the provided ID.",
        success: false,
      });
    }

    // ✅ Lấy avatar và cover từ bảng Images, dùng enum chính xác
    const [avatar, cover] = await Promise.all([
      fastify.prisma.images.findFirst({
        where: {
          imageableId: blogRes.id,
          imageableType: ImageableType.blog20, // <— dùng enum chính xác
          type: "avatar",
          deletedAt: null,
        },
        select: { url: true, publicId: true },
        orderBy: { createdAt: "desc" },
      }),
      fastify.prisma.images.findFirst({
        where: {
          imageableId: blogRes.id,
          imageableType: ImageableType.blog20,
          type: "cover",
          deletedAt: null,
        },
        select: { url: true, publicId: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    // ✅ Lấy danh sách phụ thuộc vào typeRequest
    let accounts: any[] = [];
    let links: any[] = [];
    let total = 0;

    if (blogRes.typeRequest === "register") {
      // 🧩 Lấy danh sách account thuộc group
      if (blogRes.blogGroupId) {
        accounts = await fastify.prisma.blog20Account.findMany({
          where: {
            blogGroupId: blogRes.blogGroupId,
            deletedAt: null,
          },
          select: {
            id: true,
            website: true,
            username: true,
            email: true,
            password: true,
            status: true,
            note: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        });
        // Tính tổng số Account
        total = accounts.length;
      }
    } else if (blogRes.typeRequest === "post") {
      // 🧩 Lấy danh sách link thuộc request
      links = await fastify.prisma.blog20Link.findMany({
        where: {
          blogRequestId: blogRes.id,
          deletedAt: null,
        },
        select: {
          id: true,
          blogRequestId: true,
          id_tool: true,
          domain: true,
          link_post: true,
          status: true,
          note: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
      // Tính tổng số Links
      total = links.length;
    }

    return reply.status(200).send({
      message: "Blog20Request details fetched successfully.",
      success: true,
      blog: {
        ...blogRes,
        avatar,
        cover,
        total,
        accounts,
        links,
      },
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};

export const getBlog20RequestCountById = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: Blog20RequestParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const { id: userId, role } = request.user as { id: string; role: string };
    const isAdmin = role === "admin" || role === "dev";

    const blogRes = await fastify.prisma.blog20Request.findUnique({
      where: isAdmin ? { id } : { id, userId },
      select: {
        blog20_link: true,
        auction_price: true,
        status: true,
      },
    });

    if (!blogRes) {
      return reply.status(404).send({
        message: "Blog request not found with the provided ID.",
        success: false,
      });
    }

    // Lọc link hợp lệ
    const filteredLinks1 = blogRes.blog20_link.filter((link: any) => link.link_profile !== "");

    const filteredLinks2 = blogRes.blog20_link.filter(
      (link: any) => link.link_profile !== "" && link.note === "stacking" && link.link_post !== link.link_profile
    );

    const uniqueLinks = new Set([...filteredLinks1, ...filteredLinks2]);
    const linkCount = uniqueLinks.size;

    // Giả sử auction_price là "giới hạn" giống entity_limit
    const ratio = blogRes.auction_price > 0 ? (linkCount / blogRes.auction_price) * 100 : 0;

    return reply.status(200).send({
      success: true,
      status: blogRes.status,
      blog20_links: linkCount,
      auction_price: blogRes.auction_price,
      ratio: Number(ratio.toFixed(0)),
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
