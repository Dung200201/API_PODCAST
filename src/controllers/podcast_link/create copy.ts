import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { v7 as uuidv7 } from "uuid";

export const createPodcastLinkFromAccounts = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { podcastRequestId: string } }>,
  reply: FastifyReply
) => {
  try {
    const { podcastRequestId } = request.params;

    // 1️⃣ Lấy Blog20Request
    const podcastRequest = await fastify.prisma.podcastRequest.findUnique({
      where: { id: podcastRequestId },
    });

    if (!podcastRequest) {
      return reply.status(404).send({
        success: false,
        message: "PodcastRequest not found",
      });
    }

    if (!podcastRequest.podcastGroupId) {
      return reply.status(400).send({
        success: false,
        message: "This PodcastRequest has no podcastGroupId",
      });
    }

    // 2️⃣ Lấy tất cả account live cùng group
    const liveAccounts = await fastify.prisma.podcastAccount.findMany({
      where: {
        podcastGroupId: podcastRequest.podcastGroupId,
        status: "live",
        deletedAt: null,
      },
      select: {
        id: true,
        id_tool: true,
        website: true,
      },
    });

    if (liveAccounts.length === 0) {
      return reply.status(400).send({
        success: false,
        message: "No live accounts found in this podcast group",
      });
    }

    // 3️⃣ Chuẩn bị dữ liệu insert
    const insertData = liveAccounts.map((acc) => ({
      id: uuidv7(),
      podcastRequestId: podcastRequestId,
      id_tool: podcastRequest.id_tool ?? acc.id_tool ?? null,
      domain: acc.website,
      link_post: null,
      status: "new",
      note: null,
    }));

    // 4️⃣ Insert hàng loạt
    const created = await fastify.prisma.podcastLink.createMany({
      data: insertData,
      skipDuplicates: true,
    });

    // 5️⃣ Log + trả kết quả
    fastify.log.info(
      `Đã tạo ${created.count} link cho PodcastRequest ${podcastRequestId}`
    );

    return reply.status(201).send({
      success: true,
      message: "Links created successfully",
      podcastRequestId,
      insertedCount: created.count,
    });
  } catch (error) {
    console.error("Error creating PodcastLinks from accounts:", error);
    handleErrorResponse(reply, error);
  }
};
