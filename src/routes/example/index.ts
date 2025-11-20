import { FastifyPluginAsync } from 'fastify';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "us-east-1",
  endpoint: "https://minio.scapbot.com",
  forcePathStyle: true,
  credentials: {
    accessKeyId: "admin",
    secretAccessKey: "Dv2fX!7JLvUQ$t9S#wqG!Dct",
  },
});

// Loại bỏ các middleware liên quan đến checksum
s3.middlewareStack.remove("flexibleChecksumsMiddleware");
// Thử thêm dòng này để loại bỏ middleware tính toán MD5
s3.middlewareStack.remove("md5-js");

const example: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.post("/upload", async (request, reply) => {
    try {
      const data = await request.file(); // Sử dụng request.file() để xử lý multipart tốt hơn
      console.log("data", data);
      
      if (!data) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const fileName = data.filename;

      const command = new PutObjectCommand({
        Bucket: "testhay",
        Key: fileName,
        Body: data.file, // data.file là một stream
        ContentType: data.mimetype,
      });

      await s3.send(command);

      return reply.send({
        success: true,
        url: `https://minio.scapbot.com/testhay/${fileName}`,
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      return reply.status(500).send({ error: error.message || "Upload failed" });
    }
  });

  fastify.get('/upload', async function (request, reply) {
    return { root: true }
  })
}

export default example;