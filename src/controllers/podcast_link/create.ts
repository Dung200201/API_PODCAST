import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { v7 as uuidv7 } from "uuid";

export const createPodcastLinkMany = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const formData: any = request.body;

    // 1️⃣ Kiểm tra dữ liệu
    if (!Array.isArray(formData.data)) {
      return reply.status(400).send({
        success: false,
        message: "Invalid data format. Expected { data: [...] }",
      });
    }

    // 2️⃣ Chuẩn hóa dữ liệu trước khi insert
    const insertData = formData.data.map((item: any) => ({
      id: uuidv7(),
      podcastRequestId: item.podcastRequestId, // bắt buộc
      id_tool: item.id_tool || null,
      domain: item.domain,
      link_post: item.link_post || null,
      status: item.status || "new", // default
      note: item.note || null,
    }));

    // 3️⃣ Ghi vào DB
    const created = await fastify.prisma.podcastLink.createMany({
      data: insertData,
      skipDuplicates: true,
    });

    // 4️⃣ Trả kết quả
    fastify.log.info(`Đã thêm ${created.count} bản ghi podcast_link`);
    return reply.status(201).send({
      success: true,
      message: "Create PodcastLink success",
      insertedCount: created.count,
    });
  } catch (error) {
    console.error("Error while creating PodcastLink records:", error);
    handleErrorResponse(reply, error);
  }
};
