import { FastifyPluginAsync } from "fastify";
import { updateEntityLink } from "../../../../controllers/entity_link/update";
import { batchUpdateEntityLinkLinks } from "../../../../controllers/entity_link/updateMany";

const EntityLink: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    fastify.put<{
        Params: { id: string };
        Body: any;
    }>("/update/:id", { preHandler: [fastify.apiKeyAuth, fastify.authorize(["dev"])] },  async (req, reply) => {
       await updateEntityLink(fastify, req, reply);
    });
    fastify.put<{
        Params: { id: string };
        Body: any;
    }>("/update-many", { preHandler: [fastify.apiKeyAuth, fastify.authorize(["dev"])] },  async (req, reply) => {
       await batchUpdateEntityLinkLinks(fastify, req, reply);
    });
};

export default EntityLink;