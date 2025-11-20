import { FastifyPluginAsync } from "fastify";
import { getAllGoogleStackingLink } from "../../../controllers/google_stacking_link/getall";
import { updateGgStackingLink, UpdateManyGoogleStackingLink } from "../../../controllers/google_stacking_link/update";

const IndexLinkRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    // Lấy chi tiết thông tin
    fastify.get("/get-all",{ preHandler: [fastify.authenticate] },  async (req, reply) => {
        await getAllGoogleStackingLink(fastify, req, reply);
    });

    // fastify.get("/download-all-link", async (req, reply) => {
    //     await downloadAllLink(fastify, req, reply);
    // });
    fastify.put<{
        Params: { id: string };
        Body: any;
    }>("/update/:id", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await updateGgStackingLink(fastify, req, reply);
    });
    fastify.post<{
        Params: { id: string };
        Body: any;
    }>("/update-many", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await UpdateManyGoogleStackingLink(fastify, req, reply);
    });
};

export default IndexLinkRoutes;