import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import ExcelJS from "exceljs";
import archiver from "archiver";
import { PassThrough } from "stream";
import { handleErrorResponse } from "../../utils/handleError";

const BATCH_SIZE = 10;
const CONCURRENCY_LIMIT = 5;

export const DownLoadReport = async (
    fastify: FastifyInstance,
    request: FastifyRequest<{ Body: { ids: string[] } }>,
    reply: FastifyReply
) => {
    try {
        const { ids } = request.body;
        console.log(1);

        const { id: userId, role } = request.user as { id: string; role: string };
        const isAdmin = role === "admin" || role === "dev";

        if (!Array.isArray(ids) || ids.length === 0) {
            return reply.status(400).send({ message: "Please provide valid IDs", success: false });
        }

        // Truy xuất social đang chạy (chỉ 1 lần)
        const SocialRunning = await fastify.prisma.site.findMany({
            where: {
                status: "running",
                type: { in: ["accountSocial", "social_accountSocial"] },
            },
            select: { domain: true },
        });
        const runningDomains = new Set(SocialRunning.map(site => site.domain));

        // Thiết lập stream zip trả về
        const zipStream = new PassThrough();
        const archive = archiver("zip", { zlib: { level: 9 } });

        reply.header("Content-Type", "application/zip");
        reply.header("Content-Disposition", `attachment; filename=entity_reports_${Date.now()}.zip`);
        archive.pipe(zipStream);
        reply.send(zipStream);

        // Tạo batch ID
        const batches: string[][] = [];
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
            batches.push(ids.slice(i, i + BATCH_SIZE));
        }

        const activePromises: Promise<void>[] = [];

        const processEntityToZip = async (entityId: string) => {
            const entity = await fastify.prisma.entityRequest.findFirst({
                where: isAdmin ? { id: entityId } : { id: entityId, userId },
                select: { id: true, id_tool: true },
            });

            if (!entity) return;

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

            const filtered1 = links.filter(l => l.link_profile !== "");
            const filtered2 = links.filter(
                l => l.link_profile !== "" && l.note === "stacking" && l.link_post !== l.link_profile
            );

            const mapKey = (l: any) => JSON.stringify(l);
            const uniqueMap = new Map<string, any>();
            [...filtered1, ...filtered2].forEach(link => uniqueMap.set(mapKey(link), link));
            const uniqueLinks = Array.from(uniqueMap.values());

            if (uniqueLinks.length === 0) return;

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Entity Report");

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

            for (const task of uniqueLinks) {
                const supportSocial = runningDomains.has(task.site) ? "Yes" : "";
                worksheet.addRow({
                    ...task,
                    two_fa: entity.id_tool === "Social" ? "" : undefined,
                    support_social: entity.id_tool !== "Social" ? supportSocial : undefined,
                });
            }
            const buffer = await workbook.xlsx.writeBuffer();
            archive.append(Buffer.from(buffer as ArrayBuffer), { name: `entity_${entity.id}.xlsx` });
        };

        // Điều phối batch xử lý song song
        for (const batch of batches) {
            for (const id of batch) {
                const promise = processEntityToZip(id);
                activePromises.push(promise);

                if (activePromises.length >= CONCURRENCY_LIMIT) {
                    await Promise.race(activePromises);
                    // remove finished
                    const settled = await Promise.allSettled(activePromises);
                    activePromises.length = 0;
                    settled.forEach(r => r.status === "fulfilled");
                }
            }
        }

        // Xử lý tất cả các promise còn lại
        await Promise.allSettled(activePromises);

        // Finalize and return zip stream
        return archive.finalize().then(() => {
            zipStream.end(); // đảm bảo stream kết thúc
        }).catch((err) => {
            console.error("Error finalizing zip:", err);
            reply.status(500).send({ message: "Failed to generate ZIP file" });
        });

    } catch (error) {
        console.error("Error generating ZIP report:", error);
        return handleErrorResponse(reply, error);
    }
};
