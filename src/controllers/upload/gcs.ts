import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { bucket } from "../../config/gcs";
import { handleErrorResponse } from "../../utils/handleError";

export const getUploadSignedUrl = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { contentType, name }: any = request.body;
    // Đặt tên file sẽ upload (bạn có thể customize);
    const fileName = name ? "app/" + name + ".png" : `app/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.png`;
    const file = bucket.file(fileName);

    // Cấu hình tạo signed url
    const options = {
      version: "v4" as const,
      action: "write" as const,
      expires: Date.now() + 5 * 60 * 1000, // 5 phút
      contentType: contentType,
    };

    // Tạo URL
    const [url] = await file.getSignedUrl(options);

    return reply.send({
      success: true,
      url,
      fileName: fileName, // Trả về tên file
    });
  } catch (error: any) {
    return reply.status(500).send({ error: "Cannot create signed URL" });
  }
};

export const deleteImageGcs = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { fileName }: any = request.body;

    if (!fileName) {
      return reply.status(400).send({ error: "Image not found" });
    }

    console.log("Deleting file:", fileName);


    await Promise.allSettled([
      bucket.file(fileName).delete(), // Xoá GCS
      fastify.prisma.images.delete({ where: { publicId: fileName } }), // Xoá DB
    ]);

    return reply.status(200).send({
      success: true,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};

export const updateImageGcs = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { fileName }: any = request.body;

    if (!fileName) {
      return reply.status(400).send({ error: "Image not found" });
    }

    await Promise.allSettled([
      bucket.file(fileName).delete(), // Xoá GCS
      fastify.prisma.images.delete({ where: { publicId: fileName } }), // Xoá DB
    ]);

    return reply.status(200).send({
      success: true,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};