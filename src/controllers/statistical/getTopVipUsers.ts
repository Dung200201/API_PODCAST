import { FastifyInstance, FastifyReply } from "fastify";

export const getTopVipUsers = async (
    fastify: FastifyInstance,
    request: any,
    reply: FastifyReply
) => {
    try {
        const vipUsers = await fastify.prisma.transaction.groupBy({
            by: ['userId'],
            where: {
                type: 'credit',
                deletedAt: null,
                user: {
                    profile: {
                        role: "user"
                    }
                }
            },
            _sum: {
                points: true,
            },
            orderBy: {
                _sum: {
                    points: 'desc',
                },
            },
            take: 6,
        });

        const userIds = vipUsers.map(u => u.userId);
        const users = await fastify.prisma.user.findMany({
            where: {
                id: { in: userIds, },
                profile: {
                    role: "user"
                }
            },
            select: {
                id: true,
                email: true,
                profile: {
                    select: {
                        username: true
                    }
                }
            }
        });

        const result = vipUsers.map(vip => {
            const user = users.find((u: any) => u.id === vip.userId);

            return {
                userId: vip.userId,
                email: user?.email,
                username: user?.profile?.username,
                totalPoints: vip._sum.points,
            };
        });


        return reply.status(200).send({ success: true, count: result?.length, topVipUsers: result });
    } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ success: false, message: "Internal server error" });
    }
};
