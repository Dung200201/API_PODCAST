import { FastifyPluginAsync } from "fastify";
import { createSocialAccount } from "../../../controllers/social-account/create";
import { getAllSocialAccount } from "../../../controllers/social-account/getall";
import { updateSocialAccount } from "../../../controllers/social-account/update";
import { softDeleteSocialAccount } from "../../../controllers/social-account/delete";

const SocialAccount: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // routes create packages
  fastify.post("/create",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await createSocialAccount(fastify, request, reply);
  });
  fastify.get("/get-all",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getAllSocialAccount(fastify, request, reply);
  });
  fastify.put("/update/:id",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await updateSocialAccount(fastify, request as any, reply);
  });
  fastify.patch("/soft-delete",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await softDeleteSocialAccount(fastify, request as any, reply);
  });
};

export default SocialAccount;
