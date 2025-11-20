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

    // 1️⃣ Lấy thông tin Blog20Request hiện tại
    const currentRequest = await fastify.prisma.blog20Request.findUnique({
      where: { id },
    });

    if (!currentRequest) {
      return reply.status(404).send({
        success: false,
        message: "Blog20Request not found",
      });
    }

    // 2️⃣ Kiểm tra typeRequest phải là "register"
    if (currentRequest.typeRequest !== "register") {
      return reply.status(400).send({
        success: false,
        message: "This API only works for typeRequest='register'",
      });
    }

    if (!currentRequest.blogGroupId) {
      return reply.status(400).send({
        success: false,
        message: "This request has no blogGroupId assigned",
      });
    }

    // 3️⃣ Lấy tất cả request 'post' cùng blogGroupId
    const postRequests = await fastify.prisma.blog20Request.findMany({
      where: {
        blogGroupId: currentRequest.blogGroupId,
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
    const links = await fastify.prisma.blog20Link.findMany({
      where: {
        blogRequestId: { in: postRequestIds },
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
      include: {
        blog20Request: { select: { name: true } },
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
    const sheet = workbook.addWorksheet("Blog20 Links");

    // Cấu hình cột
    sheet.columns = [
      { header: "Request Name", key: "requestName", width: 30 },
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
        requestName: link.blog20Request.name,
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
