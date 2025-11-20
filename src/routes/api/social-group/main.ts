import { FastifyPluginAsync } from "fastify";
import { createSocialGroup } from "../../../controllers/social-group/create";
import { updateSocialGroup } from "../../../controllers/social-group/update";
import { getAllTSocialGroup } from "../../../controllers/social-group/getall";
import { softDeleteSocialGroup } from "../../../controllers/social-group/delete";
import { updateStatusSocialGroup } from "../../../controllers/social-group/patch";

const SocialGroup: FastifyPluginAsync = async (
  fastify,
  opts
): Promise<void> => {
  // routes create packages
  fastify.post(
    "/create",
    { preHandler: [fastify.authenticate] },
    async function (request, reply) {
      await createSocialGroup(fastify, request, reply);
    }
  );
  // routes create packages
  fastify.put(
    "/update/:id",
    { preHandler: [fastify.authenticate] },
    async function (request, reply) {
      await updateSocialGroup(fastify, request as any, reply);
    }
  );
  // routes getall packages
  fastify.get(
    "/get-all",
    { preHandler: [fastify.authenticate] },
    async function (request, reply) {
      await getAllTSocialGroup(fastify, request as any, reply);
    }
  );
  // routes getall packages
  fastify.patch(
    "/soft-delete",
    { preHandler: [fastify.authenticate] },
    async function (request, reply) {
      await softDeleteSocialGroup(fastify, request as any, reply);
    }
  );

  fastify.patch<{ Body: any }>(
    "/update-status/:id",
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      await updateStatusSocialGroup(fastify, req as any, reply);
    }
  );
};

export default SocialGroup;
