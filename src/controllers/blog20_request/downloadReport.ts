import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import ExcelJS from "exceljs";

export const downloadReportBlog20Request = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;

    // 1️⃣ Lấy request từ DB
    const blogRequest = await fastify.prisma.blog20Request.findUnique({
      where: { id },
    });

    if (!blogRequest) {
      return reply.status(404).send({
        success: false,
        message: "Blog20Request not found",
      });
    }

    // 2️⃣ Xác định kiểu request và truy vấn dữ liệu tương ứng
    let data: any[] = [];
    let sheetName = "";

    if (blogRequest.typeRequest === "register") {
      if (!blogRequest.blogGroupId) {
        return reply.status(400).send({
          success: false,
          message: "Request type 'register' must have blogGroupId",
        });
      }

      data = await fastify.prisma.blog20Account.findMany({
        where: {
          blogGroupId: blogRequest.blogGroupId,
          deletedAt: null,
        },
        orderBy: { createdAt: "asc" },
      });

      sheetName = "Blog20 Accounts";
    } else {
      data = await fastify.prisma.blog20Link.findMany({
        where: {
          blogRequestId: blogRequest.id,
          deletedAt: null,
        },
        orderBy: { createdAt: "asc" },
      });

      sheetName = "Blog20 Links";
    }

    // 3️⃣ Kiểm tra dữ liệu
    if (data.length === 0) {
      return reply.status(404).send({
        success: false,
        message: "No data found for this request",
      });
    }

    // 4️⃣ Tạo workbook Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(sheetName);

    // 5️⃣ Đặt cột tương ứng với typeRequest
    if (blogRequest.typeRequest === "register") {
      sheet.columns = [
        { header: "Website", key: "website", width: 25 },
        { header: "Username", key: "username", width: 20 },
        { header: "Email", key: "email", width: 25 },
        { header: "Password", key: "password", width: 20 },
        { header: "2FA", key: "twoFA", width: 20 },
        { header: "Quick Link", key: "quickLink", width: 30 },
        { header: "Home Link", key: "homeLink", width: 30 },
      ];
    } else {
      sheet.columns = [
        { header: "Domain", key: "domain", width: 25 },
        { header: "Link Post", key: "link_post", width: 50 },
      ];
    }

    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true }; // in đậm
      cell.alignment = { horizontal: 'center', vertical: 'middle' }; // căn giữa
    });

    // 6️⃣ Ghi dữ liệu
    data.forEach((row) => {
      sheet.addRow({
        ...row,
        createdAt: new Date(row.createdAt).toLocaleString(),
      });
    });

    // 7️⃣ Trả về file Excel
    const buffer = await workbook.xlsx.writeBuffer();
    reply
      .header(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
      .header(
        "Content-Disposition",
        `attachment; filename="report-${blogRequest.name}.xlsx"`
      )
      .send(buffer);
  } catch (error) {
    console.error(error);
    handleErrorResponse(reply, error);
  }
};
