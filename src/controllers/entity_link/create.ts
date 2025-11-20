import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { v7 as uuidv7 } from "uuid";

export const createEntityLinkMany = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const formData: any = request.body;

    if (!Array.isArray(formData.data)) {
      return reply.status(400).send({ success: false, message: "Invalid data format" });
    }

    const insertData = formData.data.map((item: any) => ({
      id: uuidv7(),
      id_tool: item.id_tool,
      entityRequestId : "01966703-2939-739e-989b-8d61437187e6",
      site: item.site,
      email: item.email,
      username: item.username,
      password: item.password,
      about: item.about,
      link_profile: item.link_profile,
      link_post: item.link_post || "",
      status: item.status,
      note: item.note,
    }));

    const newRequest = await fastify.prisma.entityLink.createMany({
      data: insertData,
      skipDuplicates: true,
    });

    fastify.log.info("Đẩy lên thành công");

    return reply.status(201).send({
      success: true,
      message: "Create success",
      insertedCount: newRequest.count,
    });
  } catch (error) {
    console.error("error", error);
    handleErrorResponse(reply, error);
  }
};
