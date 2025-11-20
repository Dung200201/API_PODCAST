import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import dotenv from "dotenv";
dotenv.config();

export const statisticalIndexLink = async (
    fastify: FastifyInstance,
    request: any,
    reply: FastifyReply
) => {
    try {
        const { id: userId, role } = request.user as { id: string, role: string };
        const {_role} = request.query as { _role: string };
        const isAdmin = role === "admin" && _role === "admin";
        const [totalLink, totalLinkIndexed, totalLinkNoIndex] = await Promise.all([
            // Tổng link
            fastify.prisma.indexLink.count({
                where: {
                    deletedAt: null,
                    indexRequest: {
                        ...!isAdmin && {
                            userId
                        },
                        deletedAt: null
                    }
                }
            }),

            // Link đã được index
            fastify.prisma.indexLink.count({
                where: {
                    deletedAt: null,
                    indexed: true,
                    indexRequest: {
                          ...!isAdmin && {
                            userId
                        },
                        deletedAt: null
                    }
                }
            }),

            // Link chưa được index
            fastify.prisma.indexLink.count({
                where: {
                    deletedAt: null,
                    indexed: false,
                    indexRequest: {
                          ...!isAdmin && {
                            userId
                        },
                        deletedAt: null
                    }
                }
            })
        ])

        return reply.status(200).send({
            success: true,
            statistics: {
                totalLink,
                totalLinkIndexed,
                totalLinkNoIndex,
            }
        });
    } catch (error) {
        handleErrorResponse(reply, error);
    }
};
