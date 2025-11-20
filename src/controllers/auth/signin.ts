import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { handleErrorResponse } from '../../utils/handleError';
import { ISignin } from '../../types/auth';
import { signinSchema } from '../../schema/auth';
import dotenv from "dotenv";
import { generateTokens } from '../../service/jwtService';
import { setAuthCookies } from '../../service/setCookie';
import {  getUserPreferences } from '../../service/getLanguageDb';
import { translations } from '../../lib/i18n';

dotenv.config();

export async function signin(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { email, password } = request.body as ISignin;
  const formData = request.body;

  try {

    // Validate input
    const checkValidate:any = signinSchema.safeParse(formData);

    if (!checkValidate.success) {
      const allErrors = checkValidate.error.errors.map((err:any) => err.message).join(', ');
      return reply.status(400).send({
        message: allErrors,
      });
    }

    // Check if user exists
    const user: any = await fastify.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        status: true,
        password: true,
        profile: {
          select: {
            username: true,
            role: true,
            language:true
          },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({ message: "Invalid email or password" });
    }

    if (user.status !== "active") {
      return reply.status(403).send({ message: "Your account is banned!" });
    }

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return reply.status(422).send({ message: 'Invalid email or password' });
    }

    // Tạo Access Token và Refresh Token
    const { accessToken, refreshToken } : any = await generateTokens(fastify, user);
    
    // Create User Log
    // await fastify.prisma.$transaction(async (prisma:any) => {
    //     const createdUser = await prisma.userLog.create({
    //       data: {
    //         id: uuidv7(),
    //         user: {
    //           connect: { id: user.id },
    //         },
    //         refreshToken: refreshToken,
    //         ipAddress: request.ip, // Lưu IP
    //         userAgent: request.headers["user-agent"], // Lưu User-Agent
    //       },
    //     });
    //     return createdUser;
    // });
    const data = {
      accessToken, refreshToken
    }

    // Set Cookie
    setAuthCookies(reply, data);

    const {language} = await getUserPreferences(fastify,request,user.id);
    
    // Return success response
    return reply.status(200).send({ 
      message: `${translations[language].auth.loginSuccess}`, 
      rule: user.profile.role,
      language,
      success: true,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
}
