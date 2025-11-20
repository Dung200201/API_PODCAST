import { FastifyPluginAsync } from "fastify";
import { getAllTransaction } from "../../../controllers/transaction/getall";
import { getUserTransactionPoints } from "../../../controllers/statistical/transaction";
import { createTransaction, handlePointTransactionByAdmin } from "../../../controllers/transaction/create";

const transactionRouter: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    fastify.get("/get-all", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await getAllTransaction(fastify, req, reply)
    });
    fastify.get("/summary", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await getUserTransactionPoints(fastify, req, reply)
    });
    fastify.post("/create", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await createTransaction(fastify, req, reply)
    });
    fastify.post("/transaction", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await handlePointTransactionByAdmin(fastify, req, reply)
    });
};

export default transactionRouter;