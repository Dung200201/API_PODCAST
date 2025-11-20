import { SendMailOptions } from "nodemailer";
import nodeMailer from "nodemailer";
import { Resend } from 'resend';
import dotenv from "dotenv";
import { FastifyReply, FastifyRequest, FastifyInstance } from "fastify";
import { nodeMailerConfig } from "../../config/node_mailler_config";

dotenv.config();


interface SendMailBody {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export const sendMail = async (
  fastify: FastifyInstance,
  req: FastifyRequest<{ Body: SendMailBody }>,
  reply: FastifyReply
) => {
  // const { to, subject, html, text } = req.body;
  const resend = new Resend('re_Yyiu7dCc_MsmBqdaBA6uW2G2E3DKewLuH');
  try {
    // await sendCustomEmail({
    //   to,
    //   subject,
    //   html,
    //   text,
    // });

    const data =  await resend.emails.send({
      from: 'Linkbox <noreply@linkbox.click>',
      to: ['charliepfaber@gmail.com'],
      subject: 'hello world',
      html: '<p>it works!</p>',
    });

    return reply.send({
      success: true,
      message: "Email sent successfully",
      data
    });
  } catch (error: any) {
    req.log.error(error);
    return reply.status(500).send({
      success: false,
      message: "Failed to send email",
      error: error.message,
    });
  }
};

export const sendCustomEmail = async ({
  to,
  subject,
  html,
  text,
  attachments,
}: SendMailOptions) => {
  const transporter = nodeMailer.createTransport(nodeMailerConfig);

  // Cấu hình nội dung email
  const mailOptions = {
    from: `${process.env.EMAIL_SENDER}`,
    to,
    subject,
    html,
    text,
    attachments,
  };

  // Gửi email
  try {
    await transporter.sendMail(mailOptions);
  } catch (error: any) {
    throw new Error('Server error:' + error.message);
  }
};