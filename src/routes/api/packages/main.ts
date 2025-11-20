import { FastifyPluginAsync } from "fastify";
import {  getAllPackages, getPackagesDetailById,createPackage, updatePackage, deletePackage, softDeletePackage, restorePackage, getPackagesDetailBySlug, duplicatePackage, getAllPackagesTrash } from "../../../controllers/packages";

const packages: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // routes get all packages
  fastify.get("/get-all",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getAllPackages(fastify, request, reply);
  });

  // routes create packages
  fastify.post("/create", async function (request, reply) {
    await createPackage(fastify, request, reply);
  });

  // routes create packages
  fastify.get("/get/:id",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getPackagesDetailById(fastify, request, reply);
  });

  // routes create packages
  fastify.get("/get/slug/:slug",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getPackagesDetailBySlug(fastify, request, reply);
  });

  // routes update packages
  fastify.put("/update/:id",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await updatePackage(fastify, request as any, reply);
  });

  // routes duplicate packages
  fastify.patch("/duplicate/:id",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await duplicatePackage(fastify, request as any, reply);
  });

  // routes delete packages
  fastify.delete("/delete/:id",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await deletePackage(fastify, request as any, reply);
  });
  // routes soft-delete packages
  fastify.patch("/soft-delete/:id",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await softDeletePackage(fastify, request as any, reply);
  });
  // routes restore packages
  fastify.patch("/restore/:id",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await restorePackage(fastify, request as any, reply);
  });

  // routes get all packages
  fastify.get("/get-all-trash",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getAllPackagesTrash(fastify, request, reply);
  });
};

export default packages;
