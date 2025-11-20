import { FastifyPluginAsync } from "fastify";

import { createSocialGroup } from "../../../../controllers/social-group/create";

const SocialGroupRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    fastify.post("/create",{ preHandler: [fastify.apiKeyAuth] }, async function (request, reply) {
        await createSocialGroup(fastify, request, reply);
    });
};

export default SocialGroupRoutes;