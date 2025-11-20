import { FastifyPluginAsync } from "fastify";
import { createSites } from "../../../controllers/site/add";

const siteRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // routes create packages
  fastify.post("/create", async function (request, reply) {
    await createSites(fastify, request, reply);
  });
};

export default siteRoutes;
