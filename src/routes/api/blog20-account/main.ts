import { FastifyPluginAsync } from "fastify";
import { createBlog20Account } from "../../../controllers/blog20_account/create";
import { getBlgo20AccountByRequestId } from "../../../controllers/blog20_account/get";
import { getAllBlog20Account } from "../../../controllers/blog20_account/getall";
import { updateBlog20Account } from "../../../controllers/blog20_account/update";
import { bulkUpdateBlog20Accounts } from "../../../controllers/blog20_account/update"

const Blog20AccountRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // routes create 
  fastify.post("/create", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await createBlog20Account(fastify, request, reply);
  });
  // get all
  fastify.get("/get-all", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getAllBlog20Account(fastify, request, reply);
  });

  // get bay id request
  fastify.get("/get-by-idRequest/:idRequest", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getBlgo20AccountByRequestId(fastify, request, reply);
  });

  fastify.put<{
    Params: { id: string };
    Body: any;
  }>("/update/:id", { preHandler: [fastify.authenticate] }, async (req, reply) => {
    await updateBlog20Account(fastify, req, reply);
  });
  // Update nhiều dòng
  fastify.put<{
    Params: { id: string };
    Body: any;
  }>("/update-many", { preHandler: [fastify.authenticate] }, async (req, reply) => {
    await bulkUpdateBlog20Accounts(fastify, req, reply);
  });
};

export default Blog20AccountRoutes;
