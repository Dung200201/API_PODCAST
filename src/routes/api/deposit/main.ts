import { FastifyPluginAsync } from "fastify";
import { getAllDeposit, getDepositsDetailById } from "../../../controllers/deposit";
import { createDeposit } from "../../../controllers/deposit/add";
import { updateDepositStatus } from "../../../controllers/deposit/update";
import { updateDepositStatusDashboard } from "../../../controllers/deposit/patch";

const deposit: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    fastify.post("/create-order", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await createDeposit(fastify, req, reply);
    });

    fastify.get("/get-by-id/:id", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await getDepositsDetailById(fastify, req, reply);
    });

    fastify.get("/get-all", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await getAllDeposit(fastify, req, reply)
    });
    fastify.put("/update-status/:id", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await updateDepositStatus(fastify, req, reply)
    });
    fastify.patch("/change-status/:id", { preHandler: [fastify.authenticate, fastify.authorize(["admin"])] }, async (req, reply) => {
        await updateDepositStatusDashboard(fastify, req, reply)
    });
};

export default deposit;