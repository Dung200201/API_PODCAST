import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import ExcelJS from 'exceljs';

const BATCH_SIZE = 10;
const CONCURRENCY_LIMIT = 5

export const DownLoadReport = async (
    fastify: FastifyInstance,
    request: FastifyRequest<{ Body: { ids: string[] } }>,
    reply: FastifyReply
) => {
    try {
        const { ids } = request.body;
        const { id: userId, role } = request.user as { id: string, role: string };
        const isAdmin = role === "admin" || role === "dev";

        if (!Array.isArray(ids) || ids.length === 0) {
            return reply.status(400).send({ message: "Please provide valid IDs", success: false });
        }

        const SocialRunning = await fastify.prisma.site.findMany({
            where: {
                status: "running",
                type: { in: ["accountSocial", "social_accountSocial"] },
            },
            select: { domain: true },
        });
        const runningDomains = new Set(SocialRunning.map(site => site.domain));

        const allRows: any[] = [];

        // batching entity ids
        const batches: string[][] = [];
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
            batches.push(ids.slice(i, i + BATCH_SIZE));
        }

        // concurrency control
        const queue: Promise<any>[] = [];

        for (const batch of batches) {
            const p = (async () => {
                const entities = await fastify.prisma.entityRequest.findMany({
                    where: isAdmin ? { id: { in: batch } } : { id: { in: batch }, userId },
                    select: { id: true, id_tool: true },
                });

                const rows: any[] = [];

                await Promise.allSettled(
                    entities.map(async (entity) => {
                        const links = await fastify.prisma.entityLink.findMany({
                            where: {
                                entityRequestId: entity.id,
                                link_profile: { not: "" },
                            },
                            select: {
                                site: true,
                                email: true,
                                username: true,
                                password: true,
                                link_profile: true,
                                link_post: true,
                                note: true,
                            },
                        });

                        const filtered1 = links.filter(l => l.link_profile !== '');
                        const filtered2 = links.filter(
                            l => l.link_profile !== '' && l.note === 'stacking' && l.link_post !== l.link_profile
                        );

                        const mapKey = (l: any) => JSON.stringify(l);
                        const uniqueMap = new Map<string, any>();
                        [...filtered1, ...filtered2].forEach(l => uniqueMap.set(mapKey(l), l));
                        const uniqueLinks = Array.from(uniqueMap.values());

                        for (const task of uniqueLinks) {
                            const supportSocial = runningDomains.has(task.site) ? "Yes" : "";
                            rows.push({
                                entity_id: entity.id,
                                ...task,
                                two_fa: entity.id_tool === "Social" ? "" : undefined,
                                support_social: entity.id_tool !== "Social" ? supportSocial : undefined,
                            });
                        }
                    })
                );

                return rows;
            })();

            queue.push(p);

            // Giới hạn số lượng Promise đang chạy cùng lúc
            if (queue.length >= CONCURRENCY_LIMIT) {
                const finished = await Promise.race(queue);
                allRows.push(...finished);
                queue.splice(queue.findIndex(p => p === finished), 1);
            }
        }

        // Đợi tất cả batch còn lại xong
        const remaining = await Promise.allSettled(queue);
        remaining.forEach(res => {
            if (res.status === "fulfilled") {
                allRows.push(...res.value);
            }
        });

        // Tạo workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Tasks Report");

        worksheet.columns = [
            { header: "Domain", key: "site", width: 20 },
            { header: "Email", key: "email", width: 30 },
            { header: "Username", key: "username", width: 20 },
            { header: "Password", key: "password", width: 20 },
            { header: "2FA", key: "two_fa", width: 25 },
            { header: "Link Profile", key: "link_profile", width: 60 },
            { header: "Link Post", key: "link_post", width: 60 },
            { header: "Support Social", key: "support_social", width: 30 },
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' },
        };

        allRows.forEach(row => worksheet.addRow(row));

        reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        reply.header("Content-Disposition", `attachment; filename=entity_reports_${Date.now()}.xlsx`);
        const buffer = await workbook.xlsx.writeBuffer();
        return reply.send(buffer);

    } catch (error) {
        console.error("Error generating report:", error);
        return handleErrorResponse(reply, error);
    }
}; 
