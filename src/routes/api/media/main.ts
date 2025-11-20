// import { FastifyPluginAsync } from "fastify";
// import fs from "fs";
// import path from "path";
// import { pipeline } from "stream/promises";
// import { createWriteStream } from "fs";

// interface FTPError extends Error {
//   code?: string;
//   errno?: number;
//   syscall?: string;
// }

// const ALLOWED_EXTENSIONS = [".jpg", ".png"];
// // Sử dụng process.cwd() để lấy đường dẫn gốc của project
// const UPLOAD_DIR = path.join(process.cwd(), "uploads");
// const REMOTE_DIR = "/media/entity";

// const media: FastifyPluginAsync = async (
//   fastify,
//   opts
// ): Promise<void> => {
//   // Đảm bảo thư mục uploads tồn tại
//   try {
//     await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
//   } catch (error) {
//     fastify.log.error(`Failed to create upload directory: ${error}`);
//   }

//   fastify.post("/upload", async function (request, reply) {
//     let localPath = '';
    
//     try {
//       const data = await request.file();
      
//       if (!data) {
//         return reply
//           .status(400)
//           .send({
//             status: "error",
//             message: "Không tìm thấy file trong request",
//           });
//       }

//       const fileExt = path.extname(data.filename).toLowerCase();
//       if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
//         return reply
//           .status(400)
//           .send({
//             status: "error",
//             message: `Chỉ cho phép các tệp: ${ALLOWED_EXTENSIONS.join(", ")}`,
//           });
//       }

//       // Tạo tên file unique bao gồm cả timestamps và một số ngẫu nhiên
//       const timestamp = Date.now();
//       const randomStr = Math.random().toString(36).substring(2, 8);
//       const uniqueFilename = `${timestamp}-${randomStr}-${data.filename}`;
      
//       localPath = path.join(UPLOAD_DIR, uniqueFilename);
//       const remotePath = `${REMOTE_DIR}/${uniqueFilename}`;

//       // Log đường dẫn để debug
//       fastify.log.info('File paths:', {
//         uploadDir: UPLOAD_DIR,
//         localPath,
//         remotePath
//       });

//       // Đảm bảo thư mục uploads tồn tại trước khi lưu file
//       await fs.promises.mkdir(path.dirname(localPath), { recursive: true });

//       // Lưu file tạm thời
//       await pipeline(
//         data.file,
//         createWriteStream(localPath)
//       );

//       try {
//         // Kiểm tra file đã được tạo thành công
//         const fileStats = await fs.promises.stat(localPath);
//         fastify.log.info(`Local file created successfully. Size: ${fileStats.size} bytes`);

//         // Upload file
//         await fastify.ftpfile.ftpfile(localPath, remotePath);
        
//         // Verify file exists before trying to delete
//         if (fs.existsSync(localPath)) {
//           await fs.promises.unlink(localPath);
//           fastify.log.info('Local file cleaned up successfully');
//         }

//         const imageUrl = `https://cdn.scapbot.com${remotePath}`;
//         return reply.send({ 
//           status: "success", 
//           imageUrl,
//           filename: uniqueFilename 
//         });

//       } catch (error) {
//         const ftpError = error as FTPError;
        
//         fastify.log.error("FTP Error details:", {
//           message: ftpError.message,
//           code: ftpError.code,
//           errno: ftpError.errno,
//           syscall: ftpError.syscall,
//           localPath,
//           remotePath
//         });

//         // Cleanup: Xóa file tạm nếu tồn tại
//         if (fs.existsSync(localPath)) {
//           try {
//             await fs.promises.unlink(localPath);
//             fastify.log.info('Cleaned up local file after FTP error');
//           } catch (unlinkError) {
//             fastify.log.error("Failed to delete temp file:", unlinkError);
//           }
//         }
        
//         throw new Error(`FTP upload failed: ${ftpError.message || 'Unknown error'}`);
//       }

//     } catch (error) {
//       const serverError = error as Error;
      
//       // Final cleanup attempt
//       if (localPath && fs.existsSync(localPath)) {
//         try {
//           await fs.promises.unlink(localPath);
//           fastify.log.info('Cleaned up local file in final error handler');
//         } catch (unlinkError) {
//           fastify.log.error("Failed to delete temp file during error cleanup:", unlinkError);
//         }
//       }

//       fastify.log.error("Upload process failed:", {
//         error: serverError,
//         stack: serverError.stack,
//         localPath
//       });

//       return reply
//         .status(500)
//         .send({ 
//           status: "error", 
//           message: "Không thể xử lý upload file",
//           error: serverError.message || 'Unknown error'
//         });
//     }
//   });
// };

// export default media;