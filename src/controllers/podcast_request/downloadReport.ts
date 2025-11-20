import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import ExcelJS from "exceljs";

export const downloadReportPodcastRequest = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;

    // 1️⃣ Lấy request từ DB
    const podcastRequest = await fastify.prisma.podcastRequest.findUnique({
      where: { id },
    });

    if (!podcastRequest) {
      return reply.status(404).send({
        success: false,
        message: "PodcastRequest not found",
      });
    }

    // 2️⃣ Xác định kiểu request và truy vấn dữ liệu tương ứng
    let data: any[] = [];
    let sheetName = "";

    if (podcastRequest.typeRequest === "register") {
      if (!podcastRequest.podcastGroupId) {
        return reply.status(400).send({
          success: false,
          message: "Request type 'register' must have podcastGroupId",
        });
      }

      data = await fastify.prisma.podcastAccount.findMany({
        where: {
          podcastGroupId: podcastRequest.podcastGroupId,
          deletedAt: null,
          status: "live"
        },
        orderBy: { createdAt: "asc" },
      });

      sheetName = "Podcast Accounts";
    } else {
      data = await fastify.prisma.podcastLink.findMany({
        where: {
          podcastRequestId: podcastRequest.id,
          deletedAt: null,
          link_post: {
            not: null,
            notIn: ["", " "],
          },
        },
        orderBy: { createdAt: "asc" },
      });

      sheetName = "Podcast Links";
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
    if (podcastRequest.typeRequest === "register") {
      sheet.columns = [
        { header: "Website", key: "website", width: 25 },
        { header: "Username", key: "username", width: 20 },
        { header: "Email", key: "email", width: 25 },
        { header: "Password", key: "password", width: 20 },
        { header: "2FA", key: "twoFA", width: 20 },
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
        `attachment; filename="report-${podcastRequest.name}.xlsx"`
      )
      .send(buffer);
  } catch (error) {
    console.error(error);
    handleErrorResponse(reply, error);
  }
};
