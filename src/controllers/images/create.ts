import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { v7 as uuidv7 } from "uuid";
import { ImageableType, ImageType } from "@prisma/client";
import { bucket } from "../../config/gcs";

type ImageRecord = {
  fileName: string;
  imageableId?: string;
  imageableType?: ImageableType;
  type?: ImageType;
  fieldname?: string;
};

export const createImages = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: ImageRecord[] }>,
  reply: FastifyReply
) => {
  try {
    const imagesInput = request.body;
    const { id: userId } = request.user as { id: string };

    if (!Array.isArray(imagesInput) || imagesInput.length === 0) {
      return reply.status(400).send({ error: "No images provided" });
    }

    const insertedImages = [];

    for (const img of imagesInput) {
      const { imageableId, imageableType, fileName, type } = img;

      const publicId = `${fileName}`;
      const url = `https://storage.googleapis.com/likepion/${publicId}`;

      // Phàn setting ví dụ như upload ảnh
      if (imageableType === "setting") {
        const createdImage = await fastify.prisma.images.create({
          data: {
            publicId: publicId,
            url,
            type,
            imageableId,
            imageableType,
            userId
          },
        });

        insertedImages.push(createdImage);
      } else {
        // Dịch vụ
        let shouldTryUpdate = imageableId && imageableType && type;
        // TH1 & TH3: có đầy đủ thông tin liên kết
        if (shouldTryUpdate) {
          const existingImage = await fastify.prisma.images.findFirst({
            where: {
              imageableId,
              imageableType,
              type,
            },
          });

          if (existingImage) {
            // 👉 TH1: UPDATE bản ghi cũ
            await bucket.file(existingImage.publicId).delete().catch((err) => {
              fastify.log.warn(`GCS delete skipped: ${existingImage.publicId}`);
            });

            const updated = await fastify.prisma.images.update({
              where: { id: existingImage.id },
              data: {
                publicId: publicId,
                url,
                updatedAt: new Date(),
              },
            });

            insertedImages.push(updated);
            continue;
          }

          console.log(3);
          // 👉 TH1 hoặc TH3: luôn tạo mới
          const createdImage = await fastify.prisma.images.create({
            data: {
              id: uuidv7(),
              publicId,
              url,
              type,
              userId,
              imageableId,
              imageableType,
            },
          });

          insertedImages.push(createdImage);
        } else {
          // 👉 TH2: không có thông tin liên kết → add mới
          const createdImage = await fastify.prisma.images.create({
            data: {
              id: uuidv7(),
              publicId,
              url,
              type,
              userId,
              imageableId: null,
              imageableType: null,
            },
          });

          insertedImages.push(createdImage);
        }
      }
    }

    return reply.status(201).send({
      success: true,
      images: insertedImages,
    });
  } catch (error) {
    console.error("createImages error", error);
    handleErrorResponse(reply, error);
  }
};
