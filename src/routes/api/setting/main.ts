import { FastifyPluginAsync } from "fastify";
import { getBrandSetting } from "../../../controllers/setting/brand";
import { createGmailSetting } from "../../../controllers/setting/gmail/create";
import { getGmailSetting } from "../../../controllers/setting/gmail/get";
import { getModuleSetting } from "../../../controllers/setting/modules/get";
import { createTelegramSetting } from "../../../controllers/setting/telegram/create";
import { getTelegramSetting } from "../../../controllers/setting/telegram/get";
import { createKeySetting } from "../../../controllers/setting/key";

const siteRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // routes create packages
  fastify.get("/get-brand", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getBrandSetting(fastify, request, reply);
  });

  fastify.post("/setup-gmail", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await createGmailSetting(fastify, request, reply);
  });
  fastify.get("/get-gmail-config", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getGmailSetting(fastify, request, reply);
  });
  fastify.get("/modules", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getModuleSetting(fastify, request, reply);
  });

  fastify.post("/setup-telegram", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await createTelegramSetting(fastify, request, reply);
  });

  fastify.get("/get-telegram-config", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getTelegramSetting(fastify, request, reply);
  });

    fastify.post("/setup-key", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await createKeySetting(fastify, request, reply);
  });
};

export default siteRoutes;