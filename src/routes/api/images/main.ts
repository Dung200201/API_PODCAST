import { FastifyPluginAsync } from "fastify";
import { createImages } from "../../../controllers/images/create";

const uppload: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
 
  fastify.post("/create",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await createImages(fastify, request as any, reply);
  });
}
export default uppload;