import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { v7 as uuidv7 } from "uuid";
import { ImageableType, ImageType } from "@prisma/client";
import { downloadImageWithRetry, uploadImageWithRetry } from "../../utils/minio";

export const duplicateEntityRequest = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;

    const { id: userId, role } = request.user as { id: string; role: string };
    const isAdmin =
      (role === "admin") ||
      (role === "dev");

    // Lấy dữ liệu cũ từ DB
    const oldRequest = await fastify.prisma.entityRequest.findUnique({
      where: !isAdmin ? { id: id, userId } : { id: id, },
    });

    if (!oldRequest) {
      return reply
        .status(404)
        .send({ message: "Request not found", success: false });
    }

    const dataCreate: any = {
      ...oldRequest,
      id_tool: oldRequest.id_tool === "Social" ? "Social" : "",
      id: uuidv7(), // Cập nhật ID mới
      createdAt: new Date(), // Cập nhật thời gian tạo mới
      updatedAt: new Date(), // Cập nhật thời gian cập nhật mới
      status: "draft",
    }

    // Tạo dữ liệu mới dựa trên request cũ
    const newEntityRequest = await fastify.prisma.entityRequest.create({
      data: dataCreate,
    });

    // Lấy tất cả ảnh cũ từ DB
    const oldImages = await fastify.prisma.images.findMany({
      where: {
        imageableType: "entity" as ImageableType,
        imageableId: oldRequest.id,
      },
      select: {
        id: true,
        publicId: true,
        type: true,
        imageableType: true,
        imageableId: true,
        url: true,
      }
    });
    // 4. Copy ảnh trong GCS và tạo bản ghi mới
    const duplicatedImages = [];
    for (const image of oldImages) {
      const fileExtension = image.publicId.split('.').pop() || 'png';
      const newFileName = `lip/${uuidv7()}.${fileExtension}`;
      const newUploadUrl = `${process.env.UPLOAD_API}/${newFileName}`;

      const imageGetResponse = await downloadImageWithRetry(image.url);

      const imageBuffer = imageGetResponse.data;
      const contentType = imageGetResponse.headers['content-type'] || 'image/png';

      // Upload với retry
      await uploadImageWithRetry(newUploadUrl, imageBuffer, contentType);

      duplicatedImages.push({
        id: uuidv7(),
        publicId: newFileName,
        url: `${newUploadUrl}`,
        imageableId: newEntityRequest.id,
        imageableType: "entity" as ImageableType,
        type: image.type as ImageType,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    if (duplicatedImages.length > 0) {
      await fastify.prisma.images.createMany({
        data: duplicatedImages,
      });
    }

    return reply.status(201).send({
      success: true,
      message: "Duplicate request created successfully",
      entity_requests: newEntityRequest,
    });
  } catch (error) {
    console.log(error);
    handleErrorResponse(reply, error);
  }
};