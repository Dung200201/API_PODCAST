import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { v7 as uuidv7 } from "uuid";

export const createBlog20LinkFromAccounts = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { blogRequestId: string } }>,
  reply: FastifyReply
) => {
  try {
    const { blogRequestId } = request.params;

    // 1️⃣ Lấy Blog20Request
    const blogRequest = await fastify.prisma.blog20Request.findUnique({
      where: { id: blogRequestId },
    });

    if (!blogRequest) {
      return reply.status(404).send({
        success: false,
        message: "Blog20Request not found",
      });
    }

    if (!blogRequest.blogGroupId) {
      return reply.status(400).send({
        success: false,
        message: "This Blog20Request has no blogGroupId",
      });
    }

    // 2️⃣ Lấy tất cả account live cùng group
    const liveAccounts = await fastify.prisma.blog20Account.findMany({
      where: {
        blogGroupId: blogRequest.blogGroupId,
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
        message: "No live accounts found in this blog group",
      });
    }

    // 3️⃣ Chuẩn bị dữ liệu insert
    const insertData = liveAccounts.map((acc) => ({
      id: uuidv7(),
      blogRequestId: blogRequestId,
      id_tool: blogRequest.id_tool ?? acc.id_tool ?? null,
      domain: acc.website,
      link_post: null,
      status: "draft",
      note: null,
    }));

    // 4️⃣ Insert hàng loạt
    const created = await fastify.prisma.blog20Link.createMany({
      data: insertData,
      skipDuplicates: true,
    });

    // 5️⃣ Log + trả kết quả
    fastify.log.info(
      `Đã tạo ${created.count} link cho Blog20Request ${blogRequestId}`
    );

    return reply.status(201).send({
      success: true,
      message: "Links created successfully",
      blogRequestId,
      insertedCount: created.count,
    });
  } catch (error) {
    console.error("Error creating Blog20Links from accounts:", error);
    handleErrorResponse(reply, error);
  }
};
