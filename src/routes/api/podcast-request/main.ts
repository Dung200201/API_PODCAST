import { FastifyPluginAsync } from "fastify";
import { createPodcastRequestController } from "../../../controllers/podcast_request/create";
import { softDeletePodcastRequest, deletePodcastRequestById } from "../../../controllers/podcast_request/delete";
import { getPodcastRequestById, getPodcastRequestDetailsById } from "../../../controllers/podcast_request/get";
import { getAllPodcastRequest } from "../../../controllers/podcast_request/getall";
import { updatePodcastRequest } from "../../../controllers/podcast_request/update";
import { updateRegisterAndPost } from "../../../controllers/podcast_request/updateRegisterAndPost"
import { updatePodcastRequestStatus } from "../../../controllers/podcast_request/patch";
import { downloadReportPodcastRequest } from "../../../controllers/podcast_request/downloadReport";
import { downloadLinksFromRegisterRequest } from "../../../controllers/podcast_request/downloadReportAllLink"


const PodcastRequestRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    // Tao 
    fastify.post("/create", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await createPodcastRequestController(fastify, req, reply);
    });

    // Get All Request
    fastify.get("/get-all", { preHandler: [fastify.authenticate] }, async function (request, reply) {
        await getAllPodcastRequest(fastify, request as any, reply);
    });

    // Get
    fastify.get("/get-by-id/:id", { preHandler: [fastify.authenticate] }, async (request, reply) => {
        await getPodcastRequestById(fastify, request as any, reply);
    });

    // Get details by id
    fastify.get("/get-details/:id", { preHandler: [fastify.authenticate] }, async (request, reply) => {
        await getPodcastRequestDetailsById(fastify, request as any, reply);
    });

    // Update Request
    fastify.put("/update/:id", { preHandler: [fastify.authenticate], }, async (req, reply) => {
        return updatePodcastRequest(fastify, req as any, reply);
    });

    fastify.put("/update-register-post", { preHandler: [fastify.authenticate], }, async (req, reply) => {
        return updateRegisterAndPost(fastify, req as any, reply);
    });


    // Update Request qua trạng thái New check qua các điều kiện điểm và quyền user
    fastify.patch<{ Body: any; }>("/update-status/:id", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await updatePodcastRequestStatus(fastify, req, reply);
    });

    // Soft Delete (Xóa mềm)
    fastify.patch<{ Body: { ids: string[] } }>("/soft-delete", { preHandler: [fastify.authenticate] },
        async (req, reply) => {
            await softDeletePodcastRequest(fastify, req, reply);
        }
    );

    // Hard Delete (Xóa cứng)
    fastify.delete<{ Body: { ids: string[] } }>("/delete-by-ids", { preHandler: [fastify.authenticate] },
        async (req, reply) => {
            await deletePodcastRequestById(fastify, req, reply);
        }
    );

    fastify.get("/download-report/:id", async (req, reply) => {
        await downloadReportPodcastRequest(fastify, req as any, reply);
    });

    fastify.get("/download-linkall/:id", async (req, reply) => {
        await downloadLinksFromRegisterRequest(fastify, req as any, reply);
    });
};

export default PodcastRequestRoutes;