import { FastifyPluginAsync } from "fastify";
import { createSocialRequest } from "../../../controllers/social_request/add";
import { getAllSocialRequest } from "../../../controllers/social_request/getall";
import { updateStatusSocialRequest } from "../../../controllers/social_request/patch";
import { getSocialRequestById } from "../../../controllers/social_request/get";
import { updateSocialRequest } from "../../../controllers/social_request/update";
import { softDeleteSocialRequest } from "../../../controllers/social_request/delete";
import { duplicateSocialRequest } from "../../../controllers/social_request/duplicate";
import { IParams } from "../../../types/generate";
import { DownLoadReportSocial } from "../../../controllers/social_request/downloadReport";

const SocialRequestRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // routes create packages
  fastify.post("/create",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await createSocialRequest(fastify, request, reply);
  });
  // routes create packages
  fastify.get("/get-all",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getAllSocialRequest(fastify, request, reply);
  });
  // routes create packages
  fastify.patch("/update-status/:id",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await updateStatusSocialRequest(fastify, request as any, reply);
  });
  // routes create packages
  fastify.get("/get-by-id/:id",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getSocialRequestById(fastify, request as any, reply);
  });
  fastify.put("/update/:id",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await updateSocialRequest(fastify, request as any, reply);
  });
  fastify.patch("/soft-delete",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await softDeleteSocialRequest(fastify, request as any, reply);
  });
  fastify.patch("/duplicate/:id",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await duplicateSocialRequest(fastify, request as any, reply);
  });

  // Download report route
    fastify.get<{ Params: IParams }>("/download-report/:id",{ preHandler: [fastify.authenticate] },   async (req, reply) => {
        await DownLoadReportSocial(fastify, req, reply);
    });
};

export default SocialRequestRoutes;
