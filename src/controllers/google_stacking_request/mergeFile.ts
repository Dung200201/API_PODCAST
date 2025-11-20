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

export const mergeFile = async (
    fastify: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        const { ids } = request.body as { ids: string[] };

        if (!Array.isArray(ids) || ids.length === 0) {
            return reply.status(400).send({
                message: "Missing or invalid 'ids' array in request body.",
                success: false,
            });
        }

        const { id: userId, role } = request.user as { id: string, role: string };
        const isAdmin = role === "admin" || role === "dev";

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Google Stacking Report");

        worksheet.columns = [
            { header: "STT", key: "index", width: 5 },
            { header: "Site", key: "site", width: 50 },
            { header: "Type", key: "type", width: 30 },
            { header: "Url", key: "link_post", width: 100 },
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        let rowIndex = 1;

        for (const IdReq of ids) {
            const entityRes = await fastify.prisma.googleStackingRequest.findUnique({
                where: !isAdmin ? { id: IdReq, userId } : { id: IdReq },
                select: {
                    id: true,
                    folder_url: true,
                },
            });

            if (!entityRes) continue;

            const ggStackingLinks = await fastify.prisma.googleStackingLink.findMany({
                where: {
                    ggStackingRequestId: IdReq,
                    link_post: { not: "" },
                    status: "finish",
                },
                select: {
                    site: true,
                    link_post: true,
                },
            });

            if (ggStackingLinks.length === 0) continue;

            // Dòng folder_url đầu tiên
            rowIndex++;
            worksheet.addRow({
                index: rowIndex,
                site: "[FOLDER]",
                type: "GG DRIVER",
                link_post: entityRes.folder_url || ""
            });

            // Các dòng link con
            for (const link of ggStackingLinks) {
                rowIndex++;
                worksheet.addRow({
                    index: rowIndex,
                    site: link.site,
                    type: getGgType(link.site),
                    link_post: link.link_post
                });
            }

        }


        if (rowIndex === 1) {
            return reply.status(404).send({
                message: "Không có dữ liệu để xuất file Excel.",
                success: false
            });
        }

        // Set headers
        reply.header(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        reply.header(
            "Content-Disposition",
            `attachment; filename=merged_google_stacking.xlsx`
        );

        const buffer = await workbook.xlsx.writeBuffer();
        return reply.send(buffer);

    } catch (error) {
        console.error("Error generating merged Excel report:", error);
        return handleErrorResponse(reply, error);
    }
};
