import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";

export const updateDepositStatus = async (
    fastify: FastifyInstance,
    request: any,
    reply: FastifyReply
) => {
    try {
        const { id } = request.params;
        const { id: userId, role } = request.user as { id: string, role: string };
        const isAdmin = role === "admin";
        const { status, coupon_code } = request.body;

        const [deposit, pendingDeposit, couponData] = await Promise.all([
            fastify.prisma.user.findUnique({ where: { id: userId } }),
            fastify.prisma.deposit.findFirst({
                where: !isAdmin ? { id, userId, deletedAt: null, status: "new" } : { id, deletedAt: null },
                select: {
                    package: {
                        select: {
                            name: true,
                            points: true,
                            price_vnd: true
                        }
                    },
                    id: true
                }
            }),
            coupon_code
                ? fastify.prisma.coupon.findUnique({ where: { code: coupon_code } })
                : null,
        ]);

        if (!deposit) {
            return reply.status(404).send({
                message: "Data not found or already deleted.",
                success: false,
            });
        }
        
        const credit: any = await fastify.prisma.credit.findFirst({
            where: { name: "qrcode", deletedAt: null },
            select: {
                id: true,
            }
        });

        const dataReq:any = {
            status: status,
            creditId: credit.id,
            coupon_code,
            coupon_value: couponData?.couponValue,
            coupon_type: "discount",
            package_price: pendingDeposit?.package?.price_vnd,
            package_points: pendingDeposit?.package?.points,
            package_name: pendingDeposit?.package?.name,
            money_vnd: "vnd"
        }

        // Cập nhật status
        await fastify.prisma.deposit.update({
            where: { id },
            data: dataReq,
            select: {
                id: true,
            }
        });

        return reply.status(200).send({
            message: "Status updated to 'Pending' successfully.",
            success: true,
        });
    } catch (error: any) {
        handleErrorResponse(reply, error);
    }
};
