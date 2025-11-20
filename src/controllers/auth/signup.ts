import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client"; // Import Prisma types
import { ISignup } from "../../types/auth";
import { Locale, translations } from "../../lib/i18n";
import { v7 as uuidv7 } from "uuid";
import { handleErrorResponse } from "../../utils/handleError";
import { generateApiKey } from "../../utils/generateApiKey";
import bcrypt from "bcrypt";
import { signupSchema } from "../../schema/auth";
import _ from 'lodash';
import { sendCustomEmail } from "../mails/send";
import { normalizeEmail } from "../../utils/normalizeEmail";
import { sendCompleteRegistrationEvent } from "../../lib/facebookCapi";

// Khai báo type cho ngôn ngữ hỗ trợ
type SupportedLanguage = keyof typeof translations;

// Định nghĩa một kiểu mở rộng cho FastifyInstance để có prisma
interface AppFastifyInstance extends FastifyInstance {
  prisma: PrismaClient;
}

export async function signup(fastify: AppFastifyInstance, request: FastifyRequest, reply: FastifyReply) {
  try {
    const formData = request.body as ISignup;
    const { username, email, password, is, isVN } = formData;

    // 1. VALIDATION & PRE-CHECKS
    // ==================================

    // Validate request body
    const validationResult = signupSchema.safeParse(formData);
    if (!validationResult.success) {
      return reply.status(400).send({
        message: validationResult.error.errors[0].message,
      });
    }

    // 1. CHUẨN HÓA EMAIL NGAY TỪ ĐẦU
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return reply.status(400).send({ message: "Invalid email format." });
    }

    // Xác định ngôn ngữ
    const langHeader = request.headers["accept-language"] || "";
    const language: SupportedLanguage = langHeader.startsWith("vi") ? Locale.vi : Locale.en;

    // Kiểm tra người dùng và email có tồn tại không
    const [existingUsername, existingEmail]: any = await Promise.all([
      fastify.prisma.profile.findFirst({ where: { username } }),
      fastify.prisma.user.findFirst({
        // Thay đổi ở đây
        where: { email: normalizedEmail },
        select: {
          email: true,
          status: true,
        }
      }),
    ]);

    if (existingEmail) {
      return reply.status(409).send({
        statusCode: 409,
        message: `${translations[language].auth.emailExists}`,
        field: "email",
      });
    }

    if (existingUsername) {
      return reply.status(409).send({
        statusCode: 409,
        message: translations[language].auth.usernameTaken,
        field: "username",
      });
    }


    // 2. DATA PREPARATION
    // ==================================

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const pinRandom = _.sampleSize("0123456789", 4).join("").padStart(4, "0");
    const pinHashed = await bcrypt.hash(pinRandom, salt);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // OTP expires in 15 minutes


    // 3. DATABASE TRANSACTION
    // ==================================
    // Thực hiện tất cả các thao tác ghi vào CSDL trong một transaction duy nhất.
    // Nếu bất kỳ thao tác nào thất bại, tất cả sẽ được rollback.

    const createdUser = await fastify.prisma.$transaction(async (prisma) => {
      // Create User
      const user = await prisma.user.create({
        data: {
          id: uuidv7(),
          email,
          password: hashedPassword,
          status: "pending",
          // Không nên set expiresAt cho user ở đây, trường này có vẻ hợp lý hơn cho OTP
        },
      });

      // Create Profile
      await prisma.profile.create({
        data: {
          id: uuidv7(),
          userId: user.id,
          username: username,
          language: language === "en" ? "en" : "auto",
          apiKey: generateApiKey(),
          isVN: isVN ? isVN : false
        },
      });

      // Create OTP
      await prisma.userOtp.create({
        data: {
          id: uuidv7(),
          userId: user.id,
          otp: pinHashed,
          expiresAt,
        },
      });

      // Handle gift coupon (if applicable)
      if (is === "GIFT1204321") {
        const gift = await prisma.coupon.findFirst({
          where: {
            code: "GIFT1204321",
            isActive: true,
            couponType: "reward",
            deletedAt: null
          },
          select: { id: true }
        });

        if (gift) {
          await prisma.transaction.create({
            data: {
              id: uuidv7(),
              userId: user.id,
              type: "credit",
              service: "reward",
              description: `Thank you for using Likepion's services. Likepion has just refunded 2.000 points to your account.`,
              points: 2000,
            },
          });

          const now = new Date();
          const extendedExpire = new Date(now);
          extendedExpire.setDate(extendedExpire.getDate() + 7);

          await prisma.user.update({
            where: {
              id: user.id
            },
            data: {
              expiresAt: extendedExpire
            },
          });

          await sendCompleteRegistrationEvent(normalizedEmail, reply);
        }
      }

      return user; // Trả về user đã được tạo
    });

    if (!createdUser) {
      // Trường hợp hiếm gặp transaction không trả về user
      throw new Error("User creation failed within transaction.");
    }


    // 4. POST-TRANSACTION ACTIONS (SIDE EFFECTS)
    // ==================================
    // Các hành động này chỉ được thực hiện SAU KHI transaction thành công.

    const formSendMail = {
      to: email,
      subject: "Verify Your Email Address to Get Started with LikePion",
      html: `<h1>Welcome to LikePion! 🎉</h1><p>Hi there,</p><p>Thank you for signing up with LikePion! To get started, please verify your email address by using the following verification code:</p><h2 style="font-size: 24px; letter-spacing: 2px; text-align: center;">${pinRandom}</h2><p>This code will expire in 15 minutes.</p><p>If you did not sign up for LikePion, please ignore this email.</p><p>Best regards,<br>LikePion Team</p>`,
      text: `Welcome to LikePion! 🎉\n\nThank you for signing up! Your verification code is: ${pinRandom}\n\nThis code will expire in 15 minutes.\n\nBest regards,\nLikePion Team`
    };

    // Gửi email xác thực
    await sendCustomEmail(formSendMail);


    // 5. FINAL RESPONSE
    // ==================================

    return reply.status(201).send({
      message: translations[language].auth.accountCreated,
      success: true,
    });

  } catch (error) {
    // Xử lý tất cả lỗi xảy ra trong quá trình
    handleErrorResponse(reply, error);
  }
}