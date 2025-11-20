import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import ExcelJS from 'exceljs';


// Hàm xác định loại tài liệu GG
function getGgType(site: string): string {
    if (site.includes("docs.google.com/document")) return "GG DOC";
    if (site.includes("docs.google.com/spreadsheets")) return "GG SHEET";
    if (site.includes("docs.google.com/presentation")) return "GG SLIDE";
    if (site.includes("docs.google.com/forms")) return "GG FORM";
    if (site.includes("docs.google.com/drawings")) return "GG DRAWING";
    if (site.includes("www.google.com/maps")) return "GG MAP";
    if (site.includes("colab.research.google.com")) return "GG COLAB";
    if (site.includes("sites.google.com")) return "GG SITE";
    if (site.includes("drive.google.com/file/d/pdf")) return "GG PDF";
    if (site.includes("drive.google.com/file/d/image")) return "GG IMAGE";
    if (site.includes("drive.google.com/drive/folders")) return "GG DRIVER";
    if (site.includes("earth.google.com")) return "GG EARTH";
    if (site.includes("calendar.google.com")) return "GG CALENDAR";
    return "UNKNOWN";
}

export const DownLoadReportGgStacking = async (
    fastify: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        const { id: IdReq } = request.params as { id: string };

        const { id: userId, role } = request.user as { id: string, role: string };
        const isAdmin =
            (role === "admin") ||
            (role === "dev");

        const entityRes: any = await fastify.prisma.googleStackingRequest.findUnique({
            where: !isAdmin ? { id: IdReq, userId } : { id: IdReq },
            select: {
                id: true,
            },
        });

        // Nếu không tìm thấy, trả về thông báo lỗi
        if (!entityRes) {
            return reply.status(404).send({
                message: "Google Stacking not found with the provided ID.",
                success: false,
            });
        }

        // Lấy danh sách thứ nhất: entityRequestId = id và link_profile không rỗng
        const ggStackingLink = await fastify.prisma.googleStackingLink.findMany({
            where: {
                ggStackingRequestId: IdReq,
                link_post: {
                    not: ""
                },
                status: "finish"
            },
            select: {
                site: true,
                link_post: true,
            }
        });

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Tasks Report");

        // Define columns
        worksheet.columns = [
            { header: "STT", key: "index", width: 5 },
            { header: "Site", key: "site", width: 50 },
            { header: "Type", key: "type", width: 50 },
            { header: "Link Post", key: "link_post", width: 120 },
        ];

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // worksheet.addRow({ site: "First List", font: { bold: true } });
        ggStackingLink.forEach((task, idx) => {
            worksheet.addRow({
                index: idx + 1,
                site: task.site,
                type: getGgType(task.site),
                link_post: task.link_post
            });
        });

        // Set response headers
        reply.header(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        reply.header(
            "Content-Disposition",
            `attachment; filename=entity_report_${IdReq}.xlsx`
        );

        // Generate and send the Excel file
        const buffer = await workbook.xlsx.writeBuffer();
        return reply.send(buffer);

    } catch (error) {
        // console.error("Error generating report:", error);
        return handleErrorResponse(reply, error);
    }
};
