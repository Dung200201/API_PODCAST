import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";

import dotenv from "dotenv";
import { getUserPreferences } from "../../service/getLanguageDb";
import { translations } from "../../lib/i18n";
import { sendCustomEmail } from "../mails/send";
dotenv.config();

export const forgetPassword = async (
  fastify: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
) => {
  const { email }: any = req.body;
  const website = process.env.WEBSITE_URL;
  if (!email) return reply.status(404).send({ message: "Email not found!" });
  try {
    // Check emails in the database
    const user = await fastify.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        status: true,
      }
    });

    const { language } = await getUserPreferences(fastify, req, undefined, "auto");
    // Check to see if there are any problems with your account information
    if (!user)
      return reply.status(404).send({
        message: `${translations[language].user.notFound}`,
      });
    if (user.status === "banned")
      return reply.status(404).send({
        message: `${translations[language].auth.bannedOrNotExist}`,
        success: false
      });

    // Generate JWT tokens for users
    const token = fastify.jwt.sign(
      { id: user.id },
      { algorithm: "HS256", expiresIn: 900 } 
    );

    const formSendMail = {
      to: email,
      subject: `${translations[language].password.resetRequest}`, // Email subject
      html: `<p>${translations[language].password.click} <a href="${website}/change-password?token=${token}&Yfn50HJFlmQb3dRfkMea0N8">${translations[language].password.here}</a> ${translations[language].password.toReset}</p>`, // Nội dung email
      text: `${translations[language].password.click} <a href="${website}/change-password?token=${token}&Yfn50HJFlmQb3dRfkMea0N8">${translations[language].password.here}</a> ${translations[language].password.toReset}`
    };

    // Send email
    await sendCustomEmail(formSendMail);

    // Response successful
    return reply.status(200).send({
      success: true,
      message: `${translations[language].password.resetEmailSent}`,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
