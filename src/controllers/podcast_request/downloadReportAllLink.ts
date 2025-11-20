import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import ExcelJS from "exceljs";

export const downloadLinksFromRegisterRequest = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;

    // 1️⃣ Lấy thông tin PodcastRequest hiện tại
    const currentRequest = await fastify.prisma.podcastRequest.findUnique({
      where: { id },
    });

    if (!currentRequest) {
      return reply.status(404).send({
        success: false,
        message: "podcastRequest not found",
      });
    }

    // 2️⃣ Kiểm tra typeRequest phải là "register"
    if (currentRequest.typeRequest !== "register") {
      return reply.status(400).send({
        success: false,
        message: "This API only works for typeRequest='register'",
      });
    }

    if (!currentRequest.podcastGroupId) {
      return reply.status(400).send({
        success: false,
        message: "This request has no podcastGroupId assigned",
      });
    }

    // 3️⃣ Lấy tất cả request 'post' cùng podcastGroupId
    const postRequests = await fastify.prisma.podcastRequest.findMany({
      where: {
        podcastGroupId: currentRequest.podcastGroupId,
        typeRequest: "post",
        deletedAt: null,
      },
      select: { id: true, name: true },
    });

    if (postRequests.length === 0) {
      return reply.status(404).send({
        success: false,
        message: "No 'post' requests found for this blog group",
      });
    }

    const postRequestIds = postRequests.map((r) => r.id);

    // 4️⃣ Lấy tất cả link thuộc các request trên
    const links = await fastify.prisma.podcastLink.findMany({
      where: {
        podcastRequestId: { in: postRequestIds },
        deletedAt: null,
        link_post: {
          not: null,
          notIn: ["", " "],
        },
      },
      orderBy: { createdAt: "asc" },
      include: {
        podcastRequest: { select: { name: true } },
      },
    });

    if (links.length === 0) {
      return reply.status(404).send({
        success: false,
        message: "No links found for related post requests",
      });
    }

    // 5️⃣ Tạo file Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Podcast Links");

    // Cấu hình cột
    sheet.columns = [
      { header: "Domain", key: "domain", width: 25 },
      { header: "Link Post", key: "link_post", width: 50 },
      // { header: "Status", key: "status", width: 15 },
      // { header: "Note", key: "note", width: 30 },
      // { header: "Created At", key: "createdAt", width: 22 },
    ];

    // Làm đậm + căn giữa header
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    // 6️⃣ Ghi dữ liệu
    links.forEach((link) => {
      sheet.addRow({
        requestName: link.podcastRequest.name,
        domain: link.domain,
        link_post: link.link_post,
        status: link.status,
        note: link.note,
        createdAt: new Date(link.createdAt).toLocaleString(),
      });
    });

    // 7️⃣ Xuất file Excel
    const buffer = await workbook.xlsx.writeBuffer();

    reply
      .header(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
      .header(
        "Content-Disposition",
        `attachment; filename="links-from-${currentRequest.name}.xlsx"`
      )
      .send(buffer);
  } catch (error) {
    console.error(error);
    handleErrorResponse(reply, error);
  }
};
