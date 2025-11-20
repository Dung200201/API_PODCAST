import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import dotenv from "dotenv";
import { userSearchSchema } from "../../schema/user";
import { exportExcel } from "../../utils/exportExel";
import { calculateTotalPoints } from "../../utils/calculateTotalPoints";
dotenv.config();

export const downloadExcelUser = async (
    fastify: FastifyInstance,
    request: any,
    reply: FastifyReply
) => {
    try {
        // validate
        const parseResult = userSearchSchema.safeParse(request.query);
        if (!parseResult.success) {
            return reply.status(400).send({ message: "Invalid query parameters", errors: parseResult.error.errors });
        }

        const { _status, _type, _order, _deletedAt, _s, _role, _start_date, _end_date } = parseResult.data;

        // **2. Tạo điều kiện tìm kiếm**
        const where: any = { deletedAt: null };

        if (_status) where.status = { equals: _status };
        if (_role) where.profile = { role: { equals: _role } };
        if (_type) where.profile = { ...where.profile, type: { equals: _type } };

        if (_s) {
            where.OR = [
                { email: { contains: _s } },
                { profile: { username: { contains: _s } } }
            ];
        }

        if (_deletedAt === "only_active") where.deletedAt = null;
        else if (_deletedAt === "only_deleted") where.deletedAt = { not: null };

        // Date filter
        const isValidDate = (d: string) => !isNaN(new Date(d).getTime());
        if (_start_date || _end_date) {
            where.createdAt = {};
            if (_start_date && isValidDate(_start_date)) {
                const d = new Date(_start_date);
                d.setHours(0, 0, 0, 0);
                where.createdAt.gte = d;
            }
            if (_end_date && isValidDate(_end_date)) {
                const d = new Date(_end_date);
                d.setHours(23, 59, 59, 999);
                where.createdAt.lte = d;
            }
        }

        // **3. Truy vấn dữ liệu từ bảng user**
        const users = await fastify.prisma.user.findMany({
            where,
            orderBy: { createdAt: _order || "desc" },
            select: {
                email: true,
                id: true,
                status: true,
                expiresAt: true,
                profile: {
                    select: {
                        username: true,
                        phone: true,
                        role: true,
                        type: true
                    }
                },
                transactions: {
                    where: { deletedAt: null },
                    select: { points: true, type: true },
                },
            },
        })

        // Định nghĩa columns cho từng loại dữ liệu
        const userColumns = [
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Username', key: 'username', width: 25 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Total Points', key: 'status', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Role', key: 'role', width: 15 },
            { header: 'Type', key: 'type', width: 15 },
        ];

        const userRows = users.map(user => {
            const totals = calculateTotalPoints(user.transactions);
            return {
                email: user.email,
                username: user.profile?.username ?? "",
                phone: user.profile?.phone ?? "",
                status: user.status,
                total_point_deposit: totals.total_point_deposit ?? 0,
                total_points: totals.total_points ?? 0,
                total_points_deducted: totals.total_points_deducted ?? 0,
                role: user.profile?.role ?? "",
                type: user.profile?.type ?? "",
            };
        });

        const buffer = await exportExcel(userColumns, userRows, "Users");
        reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        reply.header('Content-Disposition', `attachment; filename="Export.xlsx"`);
        return reply.send(buffer);
    } catch (error) {
        handleErrorResponse(reply, error);
    }
};
