import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { translations } from "../../lib/i18n";
import { getUserPreferences } from "../../service/getLanguageDb";
import bcrypt from "bcrypt";
import _ from "lodash";
import { v7 as uuidv7 } from "uuid";
import { sendCustomEmail } from "../mails/send";

export const sendVerificationEmailApi = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { email } = request.body as { email: string };
  const { language } = await getUserPreferences(fastify, request, undefined, "auto");

  try {
    const user: any = await fastify.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        status: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ message: translations[language].user.notFound });
    }

    // Chỉ gửi email xác thực nếu trạng thái là "pending"
    if (user.status !== "pending") {
      return reply.status(400).send({ message: translations[language].auth.accountActivated });
    }

    // Tạo OTP mới
    const salt = await bcrypt.genSalt(10);
    const pinRandom = _.sampleSize("0123456789", 4).join("").padStart(4, "0");
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    const pinHashed = await bcrypt.hash(pinRandom, salt);

    // Xoá userOtp cũ nếu có và cập nhật mới
    await fastify.prisma.userOtp.upsert({
      where: { userId: user.id },
      update: {
        otp: pinHashed,
        expiresAt,
      },
      create: {
        id: uuidv7(),
        userId: user.id,
        otp: pinHashed,
        expiresAt,
      },
    });

    // Gửi email xác thực
    const formSendMail = {
      "to": email,
      "subject": "Verify Your Email Address to Get Started with LikePion",
      "html": `<h1>Welcome to LikePion! 🎉</h1><p>Hi there,</p><p>Thank you for signing up with LikePion! To get started, please verify your email address by using the following verification code:</p><h2>Your verification code is: ${pinRandom}</h2><p>If you did not sign up for LikePion, please ignore this email.</p><p>Best regards,<br>LikePion Team</p>`,
      "text": `Welcome to LikePion! 🎉\n\nHi there,\n\nThank you for signing up with LikePion! To get started, please verify your email address by using the following verification code:\n\nYour verification code is: ${pinRandom}\n\nIf you did not sign up for LikePion, please ignore this email.\n\nIf you have any questions, feel free to contact us at support@LikePion.dev.\n\nBest regards,\nLikePion Team`
    }
    
      // Tạo transporter từ nodemailer
      await sendCustomEmail(formSendMail);

    return reply.status(200).send({
      message: translations[language].auth.verificationEmailSent,
      success: true,
    });
  } catch (error: any) {
    return reply.status(500).send({
      message: `${translations[language].auth.emailVerificationError}: ${error.message}`,
      success: false,
    });
  }
};