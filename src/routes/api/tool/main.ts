import { FastifyPluginAsync } from "fastify";
import { createTool } from "../../../controllers/tools/add";
import { checkToolRunning } from "../../../controllers/tools/patch";
import { IId_Tool } from "../../../types/generate";

const ToolRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    // Lấy chi tiết thông tin
    fastify.post("/create",  async (req, reply) => {
        await createTool(fastify, req, reply);
    });

    fastify.patch<{ Querystring: IId_Tool }>("/check-running", { preHandler: [fastify.apiKeyAuth] },  async (req, reply) => {
        await checkToolRunning(fastify, req, reply);
    });
};

export default ToolRoutes;