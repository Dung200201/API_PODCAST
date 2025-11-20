import { FastifyPluginAsync } from "fastify";
import { updateSocialAccount } from "../../../../controllers/social-account/update";
import { createSocialAccount } from "../../../../controllers/social-account/create";

const SocialAccountRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    fastify.put("/update/:id", { preHandler: [fastify.apiKeyAuth] },  async (req, reply) => {
        await updateSocialAccount(fastify, req as any, reply);
    });
    fastify.post("/create", { preHandler: [fastify.apiKeyAuth] },  async (req, reply) => {
        await createSocialAccount(fastify, req as any, reply);
    });
};

export default SocialAccountRoutes;