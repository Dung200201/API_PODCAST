import { FastifyPluginAsync } from "fastify";
import { getAllBlog20Group } from "../../../controllers/blog20_group/getall";


const Blog20Group: FastifyPluginAsync = async ( fastify, opts ): Promise<void> => {
  // routes getall packages
  fastify.get(
    "/get-all",
    { preHandler: [fastify.authenticate] },
    async function (request, reply) {
      await getAllBlog20Group(fastify, request as any, reply);
    }
  );
};

export default Blog20Group;
