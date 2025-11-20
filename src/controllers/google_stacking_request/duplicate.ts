import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { v7 as uuidv7 } from 'uuid';
import { IParams } from "../../types/generate";
import { ImageableType, ImageType } from "@prisma/client";
import { downloadImageWithRetry, uploadImageWithRetry } from "../../utils/minio";

export const duplicateGgStacking = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: IParams }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;

    const { id: userId, role } = request.user as { id: string; role: string };
    const isAdmin =
      (role === "admin") ||
      (role === "dev");

    // Lấy dữ liệu cũ từ DB
    const oldRequest = await fastify.prisma.googleStackingRequest.findUnique({
      where: !isAdmin ? { id: id, userId } : { id: id },
    });

    if (!oldRequest) {
      return reply
        .status(404)
        .send({ message: "Request not found", success: false });
    }

    // Tạo dữ liệu mới dựa trên request cũ
    const newGgStackingRequest = await fastify.prisma.googleStackingRequest.create({
      data: {
        ...oldRequest,
        id: uuidv7(), // Cập nhật ID mới
        folder_url: "",
        createdAt: new Date(), // Cập nhật thời gian tạo mới
        updatedAt: new Date(), // Cập nhật thời gian cập nhật mới
        status: "draft",
      },
    });

    // Lấy tất cả ảnh cũ từ DB
    const oldImages = await fastify.prisma.images.findMany({
      where: {
        imageableType: "googleStacking" as ImageableType,
        imageableId: oldRequest.id,
      },
    });

    // 4. Copy ảnh trong GCS và tạo bản ghi mới
    const duplicatedImages = [];
    for (const image of oldImages) {
      const fileExtension = image.publicId.split('.').pop() || 'png';
      const newFileName = `lip/${uuidv7()}.${fileExtension}`;
      const newUploadUrl = `${process.env.UPLOAD_API}/${newFileName}`;

      // Download với retry
      const imageGetResponse = await downloadImageWithRetry(image.url);

      const imageBuffer = imageGetResponse.data;
      const contentType = imageGetResponse.headers['content-type'] || 'image/png';

      // Upload với retry
      await uploadImageWithRetry(newUploadUrl, imageBuffer, contentType);

      duplicatedImages.push({
        id: uuidv7(),
        publicId: newFileName,
        url: `${newUploadUrl}`,
        imageableId: newGgStackingRequest.id,
        imageableType: "googleStacking" as ImageableType,
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
      ggstacking_requests: newGgStackingRequest,
    });
  } catch (error) {
    console.log(error);
    handleErrorResponse(reply, error);
  }
};
