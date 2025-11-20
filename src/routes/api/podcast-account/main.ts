import { FastifyPluginAsync } from "fastify";
import { createPodcastAccount } from "../../../controllers/podcast_account/create";
import { getPodcastAccountByRequestId } from "../../../controllers/podcast_account/get";
import { getAllPodcastAccount } from "../../../controllers/podcast_account/getall";
import { softDeletePodcastAccount } from "../../../controllers/podcast_account/delete"
import { updateBlog20Account } from "../../../controllers/blog20_account/update";
import { bulkUpdateBlog20Accounts } from "../../../controllers/blog20_account/update"

const PodcastAccountRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // routes create 
  fastify.post("/create", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await createPodcastAccount(fastify, request, reply);
  });
  // get all
  fastify.get("/get-all", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getAllPodcastAccount(fastify, request, reply);
  });

  // get by id request
  fastify.get("/get-by-idRequest/:idRequest", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getPodcastAccountByRequestId(fastify, request, reply);
  });

  // Soft Delete
  fastify.patch("/soft-delete", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await softDeletePodcastAccount(fastify, request as any, reply);
  });

  fastify.put<{ Params: { id: string }; Body: any; }>("/update/:id", { preHandler: [fastify.authenticate] }, async (req, reply) => {
    await updateBlog20Account(fastify, req, reply);
  });

  // Update nhiều dòng
  fastify.put<{ Params: { id: string }; Body: any; }>("/update-many", { preHandler: [fastify.authenticate] }, async (req, reply) => {
    await bulkUpdateBlog20Accounts(fastify, req, reply);
  });



};

export default PodcastAccountRoutes;
