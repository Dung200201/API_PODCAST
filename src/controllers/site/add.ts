import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { v7 as uuidv7 } from 'uuid';
import { handleErrorResponse } from "../../utils/handleError";

export const createSites = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { sites }: { sites: string[] } = request.body as any;

    const newSites:any = sites.map((domain: string) => ({
      id: uuidv7(),
      userId: "01960bf4-3977-7339-882c-3337cfe0e43e",
      domain,
      note: "",
      group: "normal",
      type: "entity",
      status: "running",
      traffic: 0,
      DA: 0,
    }));

    const result = await fastify.prisma.site.createMany({
      data: newSites,
      skipDuplicates: true
    });

    return reply
      .status(200)
      .send({ message: "Created data successfully!", success: true, result });
  } catch (error) {
    console.log(error);
    handleErrorResponse(reply, error);
  }
};
