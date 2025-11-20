import { FastifyPluginAsync } from "fastify";
import { createCredit, deleteCredit, getAllCredit, getAllCreditTrash, getCreditDetailById, restoreCredit, softDeleteCredit, updateCredit } from "../../../controllers/credit";

const user: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // routes get all packages
  fastify.get("/get-all", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getAllCredit(fastify, request, reply);
  });
  // routes get all packages
  fastify.get("/get-all-trash", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getAllCreditTrash(fastify, request, reply);
  });
  // routes create packages
  fastify.post("/create", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await createCredit(fastify, request, reply);
  });
  // routes create packages
  fastify.get("/get/:id", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getCreditDetailById(fastify, request, reply);
  });
  // routes create packages
  fastify.put("/update/:id", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await updateCredit(fastify, request as any, reply);
  });
  // routes create packages
  fastify.delete("/delete/:id", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await deleteCredit(fastify, request as any, reply);
  });
  // routes soft delete
  fastify.patch("/soft-delete/:id", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await softDeleteCredit(fastify, request as any, reply);
  });
  // routes restore delete
  fastify.patch("/restore-delete/:id", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await restoreCredit(fastify, request as any, reply);
  });
  
};

export default user;
