import { FastifyPluginAsync } from "fastify";
import { getAllEntityLink } from "../../../controllers/entity_link/getall";
import { createEntityLinkMany } from "../../../controllers/entity_link/create";
import { bulkUpdateEntityLinks, updateEntityLink } from "../../../controllers/entity_link/update";
import { downloadAllLink } from "../../../controllers/entity_link/getall copy";

const IndexLinkRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    // Lấy chi tiết thông tin
    fastify.get("/get-all", async (req, reply) => {
        await getAllEntityLink(fastify, req, reply);
    });

    fastify.get("/download-all-link", async (req, reply) => {
        await downloadAllLink(fastify, req, reply);
    });

    // Lấy chi tiết thông tin
    fastify.post("/create", async (req, reply) => {
        await createEntityLinkMany(fastify, req, reply);
    });
    fastify.put<{
        Params: { id: string };
        Body: any;
    }>("/update/:id", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await updateEntityLink(fastify, req, reply);
    });
    fastify.post<{
        Params: { id: string };
        Body: any;
    }>("/update-many", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await bulkUpdateEntityLinks(fastify, req, reply);
    });
};

export default IndexLinkRoutes;