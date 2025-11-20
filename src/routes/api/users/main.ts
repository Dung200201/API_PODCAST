import { FastifyPluginAsync } from "fastify";
import { bannedUser, deleteUser,updateUser, getAllUser, getAllUserTrash, getUseryId, restoreBannedUser, restoreUser, softDeleteUser } from "../../../controllers/user";
import { getUserCurrent } from "../../../controllers/auth/getUserCurrent";
import { patchUser } from "../../../controllers/user/patch";
import { createUserAccount } from "../../../controllers/user/create";
import { downloadExcelUser } from "../../../controllers/user/download";

const user: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
 
  // get list user
  fastify.get("/get-all",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getAllUser(fastify, request, reply);
  });
  // get list user
  fastify.post("/create",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await createUserAccount(fastify, request, reply);
  });

  // get user by id
  fastify.get("/get-by-id/:id",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getUseryId(fastify, request, reply);
  });

  fastify.get("/get-current",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
      await getUserCurrent(fastify, request, reply);
  });

  //  Update user
  fastify.put("/update-profile/:id",async function (request, reply) {
    await updateUser(fastify, request as any, reply);
  });

  //  delete user
  fastify.delete("/delete/:id",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await deleteUser(fastify, request as any, reply);
  });

   //  soft user
   fastify.patch("/soft-delete/:id",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await softDeleteUser(fastify, request as any, reply);
  });

  //  restore user
    fastify.patch("/restore-delete/:id",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await restoreUser(fastify, request as any, reply);
  });

  //  banned user
  fastify.patch("/banned/:id",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await bannedUser(fastify, request as any, reply);
  });
  //  restore-banned user
  fastify.patch("/restore-banned/:id",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await restoreBannedUser(fastify, request as any, reply);
  });

  // routes get all packages
  fastify.get("/get-all-trash",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await getAllUserTrash(fastify, request, reply);
  });

  //  restore-banned user
  fastify.patch("/patch-profile/:id",{ preHandler: [fastify.authenticate] }, async function (request, reply) {
    await patchUser(fastify, request as any, reply);
  });

  //  download excel
  fastify.get("/download-excel",async function (request, reply) {
    await downloadExcelUser(fastify, request as any, reply);
  });
};

export default user;
