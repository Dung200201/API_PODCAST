import { FastifyPluginAsync } from "fastify";
import { createPodcastLinkMany } from "../../../controllers/podcast_link/create"
import { getAllPodcastLink } from "../../../controllers/podcast_link/getall"
import { updatePodcastLink, bulkUpdatePodcastLinks } from "../../../controllers/podcast_link/update"
import { createPodcastLinkFromAccounts } from "../../../controllers/podcast_link/create copy"

const Blog20LinkRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {

    // Tạo 1 lúc nhiều dòng trong bảng link
    fastify.post("/create-many", async (request, reply) => {
        await createPodcastLinkMany(fastify, request, reply);
    });

    // Tạo các bản ghi của bảng link theo id Request
    fastify.post<{ Params: { podcastRequestId: string } }>("/create-links/:podcastRequestId", async (request, reply) => {
            await createPodcastLinkFromAccounts(fastify, request, reply);
    });

    // Get all link (có các điều kiện)
    fastify.get("/get-all", async (req, reply) => {
        await getAllPodcastLink(fastify, req, reply);
    });

    fastify.put<{Params: { id: string }; Body: any;}>("/update/:id", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await updatePodcastLink(fastify, req, reply);
    });

    fastify.put<{Params: { id: string };Body: any;}>("/update-many", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await bulkUpdatePodcastLinks(fastify, req, reply);
    });

};

export default Blog20LinkRoutes;