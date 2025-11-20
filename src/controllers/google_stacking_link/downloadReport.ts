import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import ExcelJS from 'exceljs';

export const DownLoadReportGgStackingLink = async (
    fastify: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        const { website } = request.query as { website: string };

        const requests: any = await fastify.prisma.googleStackingRequest.findMany({
            where: {
                website
            },
            select: {
                id: true,
            },
        });
        
        // Nếu không tìm thấy, trả về thông báo lỗi
        if (requests.length === 0) {
            return reply.status(404).send({
                message: "No requests found for the given website.",
                success: false,
            });
        }
        const requestIds = requests.map((r: any) => r.id);

        // Lấy danh sách thứ nhất: entityRequestId = id và link_profile không rỗng
        const entityLinks = await fastify.prisma.googleStackingLink.findMany({
            where: {
                ggStackingRequestId: { in: requestIds },
                link_post: { not: "" },
            },
            select: {
                site: true,
                link_post: true,
                note: true,
            },
        });

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Tasks Report");

        // Define columns
        worksheet.columns = [
            { header: "Site", key: "site", width: 20 },
            { header: "Link Post", key: "link_post", width: 60 },
        ];

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data from first list
        // worksheet.addRow({ site: "First List", font: { bold: true } });
        entityLinks.forEach(task => {
            worksheet.addRow(task);
        });


        // Set response headers
        reply.header(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        reply.header(
            "Content-Disposition",
            `attachment; filename=ggStacking_report.xlsx`
        );

        // Generate and send the Excel file
        const buffer = await workbook.xlsx.writeBuffer();
        return reply.send(buffer);

    } catch (error) {
        console.error("Error generating report:", error);
        return handleErrorResponse(reply, error);
    }
};
