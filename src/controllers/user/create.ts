// src/services/auth/createUserAccount.ts
import { v7 as uuidv7 } from "uuid";
import bcrypt from "bcrypt";
import { generateApiKey } from "../../utils/generateApiKey";
import _ from "lodash";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getUserPreferences } from "../../service/getLanguageDb";
import { translations } from "../../lib/i18n";
import { sendCustomEmail } from "../mails/send";

export interface CreateUserInput {
  email: string;
  password: string;
  username: string;
  language: "en" | "auto";
  role?: "user" | "support" | "dev" | "admin";
  type?: "normal" | "advanced" | "priority";
  phone?: string;
  company?: string;
  status?: "pending" | "active" | "banned"; // Optional override
}

export async function createUserAccount(
    fastify: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply
) {
    const {
        email,
        password,
        username,
        language,
        role = "user",
        type = "normal",
        phone,
        company,
        status = "pending",
    } = request.body as CreateUserInput;
      
  try {
    const { language:langs } = await getUserPreferences(fastify, request, undefined, "auto");

    // Kiểm tra người dùng và email có tồn tại không
    const [existingUsername, existingEmail]:any = await Promise.all([
        fastify.prisma.profile.findFirst({ where: { username } }),
        fastify.prisma.user.findFirst({ where: { email }, select: {
        email:true,
        status: true,
        } }),
    ]);

    if (existingEmail) {
        return reply.status(409).send({
        statusCode: 409,
        message: `${translations[langs].auth.emailExists}`,
        field: "email", 
        });
    }

    if (existingUsername) {
        return reply.status(409).send({
        statusCode: 409,
        message: `${translations[langs].auth.usernameTaken}`,
        field: "username",
        });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const pinRandom = _.sampleSize("0123456789", 4).join("").padStart(4, "0");
    const pinHashed = await bcrypt.hash(pinRandom, salt);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const newData = await fastify.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                id: uuidv7(),
                email,
                password: hashedPassword,
                status,
            },  
            select: {
                id: true,
                profile: true,
                email: true,
                status: true
            }
        });

        const profile =  await tx.profile.create({
            data: {
                id: uuidv7(),
                userId: user.id,
                username,
                language,
                role,
                type,
                phone,
                company,
                apiKey: generateApiKey(),
            },
        });

        await tx.userOtp.create({
        data: {
            id: uuidv7(),
            userId: user.id,
            otp: pinHashed,
            expiresAt,
        },
        });

        return {
            ...user,
            profile: profile
        }
    });
    const statusPending = status === "pending"
    if(statusPending){
        // Tạo transporter từ nodemailer
         const formSendMail = {
            "to": email,
            "subject": "Verify Your Email Address to Get Started with Likepion",
            "html": `<h1>Welcome to Likepion! 🎉</h1><p>Hi there,</p><p>Thank you for signing up with Likepion! To get started, please verify your email address by using the following verification code:</p><h2>Your verification code is: ${pinRandom}</h2><p>If you did not sign up for Likepion, please ignore this email.</p><p>If you have any questions, feel free to contact us at <a href='mailto:support@likepion.dev'>support@likepion.dev</a>.</p><p>Best regards,<br>Likepion Team</p>`,
            "text": `Welcome to Likepion! 🎉\n\nHi there,\n\nThank you for signing up with Likepion! To get started, please verify your email address by using the following verification code:\n\nYour verification code is: ${pinRandom}\n\nIf you did not sign up for Likepion, please ignore this email.\n\nIf you have any questions, feel free to contact us at support@likepion.dev.\n\nBest regards,\nLikepion Team`
        }
    
        // Tạo transporter từ nodemailer
        await sendCustomEmail(formSendMail);
    }

    // Trả về kết quả
    return reply
    .status(200)
    .send({ message: statusPending ? translations[langs].auth.accountCreated: translations[langs].auth.createAccountSuccess, 
        success: true, 
        newData 
    });
   } catch (error) {
      console.log(error);
      handleErrorResponse(reply, error); // Hàm xử lý lỗi
    }
}
