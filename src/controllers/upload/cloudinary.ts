import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pipeline } from "stream/promises";
import cloudinary from "../../config/cloudinary";
import { v7 as uuidv7 } from "uuid";

type ImageRecord = {
  url: string;
  publicId: string;
  userId: string;
  fieldname: string;
};

// 📌 Hàm dùng chung để upload ảnh
const uploadFilesToCloudinary = async (request: FastifyRequest, folder: string) => {
  if (!request.isMultipart()) {
    throw new Error("Request is not multipart");
  }

  const files = [];
  const parts = request.files(); // Lấy tất cả file từ request

  for await (const part of parts) {
    // console.log("🧩 Multipart Part:", {
    //   fieldname: part.fieldname,
    //   filename: part.filename,
    //   mimetype: part.mimetype,
    // });
    files.push(
      new Promise(async (resolve, reject) => {
        const fieldname = part.fieldname; // ✅ Lấy tên trường file

        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            quality: "auto:eco",
            resource_type: "auto",
            width: 1280,
            dpr: "auto",
            crop: "limit",
            format: "png",
          },
          (error, result: any) => {
            if (error) return reject(error);
            console.log("result", result);

            // ✅ Gắn thêm fieldname vào kết quả trả về
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
              fieldname: fieldname,
            });
          }
        );

        await pipeline(part.file, uploadStream); // Tránh rò rỉ bộ nhớ
      })
    );
  }

  return Promise.all(files); // Upload tất cả file song song
};

// 📌 API upload nhiều ảnh
export const uploadImages = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { id: userId } = request.user as { id: string };

    const results = await uploadFilesToCloudinary(request, "likepion");

    // Chuẩn bị data ảnh
    const imageRecords: ImageRecord[] = results.map((file: any) => ({
      url: file.secure_url,
      publicId: file.public_id.replace(/^likepion\//, ""), // chỉ loại bỏ nếu bắt đầu bằng likepion/
      userId,
      fieldname: file.fieldname,
      id: uuidv7()
    }));

    const imageRecordsForDB = imageRecords.map(({ fieldname, ...rest }) => rest);

    await fastify.prisma.images.createMany({
      data: imageRecordsForDB,
    });

    return reply.send({
      message: "Upload successful",
      files: imageRecords
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return reply.status(500).send({ error: error.message || "Upload failed" });
  }
};

// 📌 API cập nhật ảnh
export const updateImage = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { publicId: string } }>,
  reply: FastifyReply
) => {
  try {
    const { publicId } = request.params;
    const cloudinaryId = `likepion/${publicId}`;

    const result = await cloudinary.api.resource(`likepion/${publicId}`);
    console.log("Ảnh tồn tại:", result);

    // Xoá ảnh cũ
    const deleteResult = await cloudinary.uploader.destroy(cloudinaryId);
    if (deleteResult.result !== "ok") {
      console.warn(`Failed to delete image: ${cloudinaryId}`);
    }

    // Upload ảnh mới
    const results: any = await uploadFilesToCloudinary(request, "likepion");

    await fastify.prisma.images.updateMany({
      where: {
        publicId: publicId,
      },
      data: {
        url: results[0].secure_url,
        publicId: results[0].public_id.replace(/^likepion\//, ""),
      },
    })

    return reply.send({
      message: "Update successful",
      files: [
        {
          ...results[0],
          public_id: undefined,
          secure_url: undefined,
          url: results[0].secure_url,
          publicId: results[0].public_id,
        }
      ]
    });
  } catch (error: any) {
    console.error("Update error:", error);
    return reply.status(500).send({ error: error?.error?.message || "Update failed" });
  }
};


// 📌 Xoá ảnh
export const deleteImage = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { publicId: string } }>,
  reply: FastifyReply
) => {
  try {
    const { publicId } = request.params;
    const cloudinaryId = `likepion/${publicId}`;

    // Xoá ảnh
    const result = await cloudinary.uploader.destroy(cloudinaryId);

    if (result.result !== "ok") {
      console.warn(`Failed to delete image: ${cloudinaryId}`);
      return reply.status(400).send({ message: result.result });
    }

    await fastify.prisma.images.delete({
      where: {
        publicId: publicId, // hoặc `likepion/${publicId}` nếu bạn lưu full đường dẫn
      },
    });

    return reply.send({ message: "Delete successful", success: true });
  } catch (error: any) {
    console.error("Delete error:", error);
    return reply.status(500).send({ error: error.message || "Delete failed" });
  }
};