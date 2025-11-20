import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import ExcelJS from 'exceljs';

export const DownLoadReportSocial = async (
    fastify: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        const { id: IdReq } = request.params as { id: string };

        const { id: userId, role } = request.user as { id: string, role: string };
        const isAdmin = role === "admin" || role === "dev";

        const social: any = await fastify.prisma.socialRequest.findUnique({
            where: !isAdmin ? { id: IdReq, userId } : { id: IdReq },
            select: {
                id: true,
                id_tool: true
            },
        });

        // Nếu không tìm thấy, trả về thông báo lỗi
        if (!social) {
            return reply.status(404).send({
                message: "Social not found with the provided ID.",
                success: false,
            });
        }

        // Lấy danh sách thứ nhất: entityRequestId = id và link_profile không rỗng
        const socialLinks = await fastify.prisma.socialLink.findMany({
            where: {
                socialRequestId: IdReq,
                link_post: {
                    not: ""
                },
                status: "completed"
            },
            select: {
                domain: true,
                dataSocialAccount: true,
                link_post: true,
            }
        });

        const socialMap = socialLinks?.map((item) => {
            const account = typeof item.dataSocialAccount === "string"
                ? JSON.parse(item.dataSocialAccount)
                : item.dataSocialAccount || {}
            return {
                domain: item.domain,
                email: account.email || "",
                username: account.username && account.username !== "undefined" ? account.username : "",
                password: account.password || "",
                twoFA: account.twoFA || "",
                link_post: item.link_post || ""
            }
        })

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Tasks Report");

        // Define columns
        worksheet.columns = [
            { header: "Domain", key: "domain", width: 20 },
            { header: "Email", key: "email", width: 30 },
            { header: "Username", key: "username", width: 20 },
            { header: "Password", key: "password", width: 20 },
            { header: "2FA", key: "twoFA", width: 20 },
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
        socialMap.forEach(task => {
            worksheet.addRow(task);
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
        console.error("Error generating report:", error);
        return handleErrorResponse(reply, error);
    }
};
