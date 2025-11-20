import { FastifyPluginAsync } from "fastify";
import { getSummaryStatistics } from "../../../controllers/statistical/summary";
import { getTopVipUsers } from "../../../controllers/statistical/getTopVipUsers";
import { getRevenueByDay } from "../../../controllers/statistical/getRevenueByDay";


const transactionRouter: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    fastify.get("/summary", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await getSummaryStatistics(fastify, req, reply)
    });
    fastify.get("/revenue-by-day", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await getRevenueByDay(fastify, req as any, reply)
    });
    fastify.get("/vip-users", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await getTopVipUsers(fastify, req, reply)
    });
   
};

export default transactionRouter;