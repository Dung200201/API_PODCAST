import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import dotenv from "dotenv";
import z from "zod";
import bcrypt from "bcrypt";
import { translations } from "../../lib/i18n";
import { getUserPreferences } from "../../service/getLanguageDb";
import { handleErrorResponse } from "../../utils/handleError";
dotenv.config()

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(4), // 4 ký tự OTP
});

export async function verifyEmail(fastify: FastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  const body = schema.safeParse(request.body);
  
  if (!body.success) {
    return reply.status(400).send({
      message: body.error.errors[0].message, // Lấy lỗi đầu tiên
    });
  }
  
  const { email,code } = request.body as any; // Lấy token từ query string

  try {
    const user = await fastify.prisma.user.findUnique({
      where: { email },
      select:{
        status: true,
        userotp: true,
      }
    });
    const { language } = await getUserPreferences(fastify, request, undefined, "auto");
    if (!user || !user.userotp) {
      return reply.status(400).send({ message: translations[language].auth.userOrOtpNotFound, success:false });
    } 

    if (user.status === "active") {
      return reply.status(400).send({ message: translations[language].auth.accountAlreadyVerified, success:false });
    }
    
    const otpRecord = user.userotp;

    // So sánh mã pin người dùng nhập với bản mã hoá trong DB
    const isOtpValid = await bcrypt.compare(code, otpRecord.otp);

    if (!isOtpValid) {
      return reply.status(400).send({ message: translations[language].auth.invalidOtpCode,success:false });
    }

    if (otpRecord.expiresAt < new Date()) {
      return reply.status(400).send({ message: translations[language].auth.otpExpired,success:false });
    }

    // OTP valid → update user status and delete OTP record
    await fastify.prisma.user.update({
      where: { email },
      data: {
        status: "active",
        userotp: {
          delete: true, // Xóa OTP để không thể dùng lại
        },
      },
    });

    return reply.send({ message: translations[language].auth.emailVerifiedSuccessfully,success:true });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
}
