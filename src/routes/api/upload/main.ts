import { FastifyPluginAsync } from "fastify";
import { deleteImageMinio, uploadImageMinio } from "../../../controllers/upload/minio";

const uppload: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // routes get all packages
  fastify.post("/upload-images", { preHandler: [fastify.authenticate] }, async function (request, reply) {
    await uploadImageMinio(fastify, request as any, reply);
  });

  // fastify.put("/update-images/:publicId", { preHandler: [fastify.authenticate] }, async function (request, reply) {
  //   await updateImage(fastify, request as any, reply);
  // });

  // fastify.delete("/delete-images/:publicId", { preHandler: [fastify.authenticate] }, async function (request, reply) {
  //   await deleteImage(fastify, request as any, reply);
  // });

  // fastify.post("/signed-url", { preHandler: [fastify.authenticate] },async function (request, reply) {
  //   await getUploadSignedUrl(fastify, request as any, reply);
  // });

  fastify.post("/delete-image",async function (request, reply) {
    await deleteImageMinio(fastify, request as any, reply);
  });
}
export default uppload;