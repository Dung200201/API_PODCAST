import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
import { IParams } from "../../types/generate";
dotenv.config();

export const getSocialRequestById = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: IParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params as { id: string };
    const { id: userId, role } = request.user as { id: string, role: string };
    const isAdmin = role === "admin" || role === "dev";

    const social: any = await fastify.prisma.socialRequest.findUnique({
      where: !isAdmin ? { id: id, userId, deletedAt: null } : { id: id, deletedAt: null },
      select: {
        id: true,
        socialgroup: {
          select: {
            id: true,
            name: true
          }
        },
        name: true,
        // id_tool: true,
        data: true,
        status: true,
        social_links: {
          where: {
            deletedAt: null
          },
          select: {
            id: true,
            domain: true,
            link_post: true,
            status: true
          }
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    // Nếu không tìm thấy, trả về thông báo lỗi
    if (!social) {
      return reply.status(404).send({
        message: "The data does not exist or has been deleted! Please try again after verifying the information",
        success: false,
      });
    }

    let parsedData = {};
    try {
      parsedData = JSON.parse(social.data || "{}");
    } catch (err) {
      // fallback nếu parse lỗi
      console.warn("Failed to parse social.data:", err);
    }

    const allLinks = social.social_links || [];

    const completedLinks = allLinks.filter(
      (link: any) => link.status === "completed" && link.link_post !== ""
    ).length;

    const ratio = allLinks?.length > 0 ? (completedLinks / allLinks?.length) * 100 : 0;

    // Trả về dữ liệu chi tiết indedx
    return reply.status(200).send({
      message: "Successfully fetched data!",
      success: true,
      socialRequest: {
        ...social,
        ratio,
        data: parsedData, // đã giải ra object
      },
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};