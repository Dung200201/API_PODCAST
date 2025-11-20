import { FastifyPluginAsync } from "fastify";
import { createCoupon, deleteCoupon, getAllCoupon, getCouponDetailById, updateCoupon } from "../../../controllers/coupon";

const user: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // routes get all packages
  fastify.get("/get-all", async function (request, reply) {
    await getAllCoupon(fastify, request, reply);
  });

  // routes create packages
  fastify.post("/create", async function (request, reply) {
    await createCoupon(fastify, request, reply);
  });

  // // routes create packages
  fastify.get("/get/:id", async function (request, reply) {
    await getCouponDetailById(fastify, request, reply);
  });

  // // routes create packages
  fastify.put("/update/:id", async function (request, reply) {
    await updateCoupon(fastify, request as any, reply);
  });

  // // routes create packages
  fastify.delete("/delete/:id", async function (request, reply) {
    await deleteCoupon(fastify, request as any, reply);
  });
  
};

export default user;
