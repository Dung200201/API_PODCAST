import { FastifyPluginAsync } from "fastify";
import { getAllPodcastGroup } from "../../../controllers/podcast_group/getall";


const Blog20Group: FastifyPluginAsync = async ( fastify, opts ): Promise<void> => {
  // routes getall packages
  fastify.get(
    "/get-all",
    { preHandler: [fastify.authenticate] },
    async function (request, reply) {
      await getAllPodcastGroup(fastify, request as any, reply);
    }
  );
};

export default Blog20Group;
