import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
// import { ImageableType } from "@prisma/client"; //  dùng enum gốc Prisma
import dotenv from "dotenv";
dotenv.config();

interface PodcastRequestParams {
  id: string;
}

export const getPodcastRequestById = async (
  fastify: FastifyInstance, request: FastifyRequest<{ Params: PodcastRequestParams }>, reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const { id: userId, role } = request.user as { id: string; role: string };
    const isAdmin = role === "admin" || role === "dev";

    const podcastRes = await fastify.prisma.podcastRequest.findUnique({
      where: !isAdmin ? { id, userId } : { id },
      select: {
        id: true,
        name: true,
        data: true,
        id_tool: true,
        podcastGroupId: true,
        userId: true,
        auction_price: true,
        target: true,
        typeRequest: true,
        status: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        podcastgroup: {
          select: { id: true, name: true },
        },
      },
    });

    if (!podcastRes) {
      return reply.status(404).send({
        message: "Podcast request not found with the provided ID.",
        success: false,
      });
    }

    // ✅ Lấy avatar từ bảng Images, dùng enum chính xác 
    // const [avatar] = await Promise.all([
    //   fastify.prisma.images.findFirst({
    //     where: {
    //       imageableId: podcastRes.id,
    //       imageableType: ImageableType.podcast, // <— dùng enum chính xác
    //       type: "avatar",
    //       deletedAt: null,
    //     },
    //     select: { url: true, publicId: true },
    //     orderBy: { createdAt: "desc" },
    //   }),
    // ]);

    return reply.status(200).send({
      message: "Podcast details fetched successfully.",
      success: true,
      podcast: {
        ...podcastRes,
        //avatar,
      },
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};

// Get chi tiết trả về số link hoặc số account
export const getPodcastRequestDetailsById = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: PodcastRequestParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const { id: userId, role } = request.user as { id: string; role: string };
    const isAdmin = role === "admin" || role === "dev";

    const podcastRes = await fastify.prisma.podcastRequest.findUnique({
      where: !isAdmin ? { id, userId } : { id },
      select: {
        id: true,
        name: true,
        data: true,
        id_tool: true,
        podcastGroupId: true,
        userId: true,
        auction_price: true,
        target: true,
        typeRequest: true,
        status: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        podcastgroup: {
          select: { id: true, name: true },
        },
      },
    });

    if (!podcastRes) {
      return reply.status(404).send({
        message: "Podcast request not found with the provided ID.",
        success: false,
      });
    }

    // ✅ Lấy avatar và cover từ bảng Images, dùng enum chính xác
    // const [avatar] = await Promise.all([
    //   fastify.prisma.images.findFirst({
    //     where: {
    //       imageableId: podcastRes.id,
    //       imageableType: ImageableType.blog20, // <— dùng enum chính xác
    //       type: "avatar",
    //       deletedAt: null,
    //     },
    //     select: { url: true, publicId: true },
    //     orderBy: { createdAt: "desc" },
    //   }),
    // ]);

    let relatedPostRequests: any[] = [];
    if (podcastRes.podcastGroupId) {
      relatedPostRequests = await fastify.prisma.podcastRequest.findMany({
        where: {
          podcastGroupId: podcastRes.podcastGroupId,
          typeRequest: "post",
          id: { not: podcastRes.id },
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          typeRequest: true,
          data: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          target: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // ✅ Lấy danh sách phụ thuộc vào typeRequest
    let accounts: any[] = [];
    let links: any[] = [];
    let total = 0;

    if (podcastRes.typeRequest === "register") {
      // 🧩 Lấy danh sách account thuộc group
      if (podcastRes.podcastGroupId) {
        accounts = await fastify.prisma.podcastAccount.findMany({
          where: {
            podcastGroupId: podcastRes.podcastGroupId,
            deletedAt: null,
          },
          select: {
            id: true,
            website: true,
            username: true,
            email: true,
            pass_mail: true,
            password: true,
            twoFA: true,
            status: true,
            note: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        });
        // Tính tổng số Account
        total = accounts.length;
      }
    } else if (podcastRes.typeRequest === "post") {
      // 🧩 Lấy danh sách link thuộc request
      links = await fastify.prisma.podcastLink.findMany({
        where: {
          podcastRequestId: podcastRes.id,
          deletedAt: null,
        },
        select: {
          id: true,
          podcastRequestId: true,
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

    const target = podcastRes.target ?? 0;
    const ratio = target > 0 ? Math.floor((total / target) * 100) : 0;


    return reply.status(200).send({
      message: "PodcastRequest details fetched successfully.",
      success: true,
      podcast: {
        ...podcastRes,
        // avatar,
        total,
        ratio,
        accounts,
        links,
        relatedPostRequests,
      },
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
