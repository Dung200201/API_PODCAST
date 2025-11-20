import { FastifyPluginAsync } from "fastify";
import { getAllSocialLink } from "../../../controllers/social_link/getall";

const SocialLinkRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // routes create packages
  fastify.get("/get-all",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getAllSocialLink(fastify, request, reply);
  });
};

export default SocialLinkRoutes;
