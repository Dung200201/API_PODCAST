import { FastifyPluginAsync } from "fastify";
import { getSocialRequestPending } from "../../../../controllers/social_request/check";
import { IId_Tool } from "../../../../types/generate";
import { createSocialRequest } from "../../../../controllers/social_request/add";


const SocialRequestRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    // Lấy chi tiết thông tin
    fastify.get<{ Querystring: IId_Tool }>("/checking", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await getSocialRequestPending(fastify, req, reply);
    });

    fastify.post("/create",{ preHandler: [fastify.apiKeyAuth] }, async function (request, reply) {
        await createSocialRequest(fastify, request, reply);
    });
};

export default SocialRequestRoutes;