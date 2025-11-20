import { FastifyPluginAsync } from "fastify";
import { createTranslate } from "../../../controllers/translate/create";

const siteRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {

  fastify.post("/create", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await createTranslate(fastify, request, reply);
  });
};

export default siteRoutes;