import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import bcrypt from "bcrypt";
import { resetPasswordSchema } from "../../schema/auth";
import { getUserPreferences } from "../../service/getLanguageDb";
import { translations } from "../../lib/i18n";

export const resetPassword = async (
  fastify: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply
) => {
  const { token, newPassword }: any = req.body;
  try {
    const {language} = await getUserPreferences(fastify,req,undefined,"auto");
    // Validate input
    const checkValidate:any = resetPasswordSchema.safeParse(req.body);

    if (!checkValidate.success) {
      const allErrors = checkValidate.error.errors.map((err:any) => err.message).join(', ');
      return reply.status(400).send({
        message: allErrors,
      });
    }
    // Verify the token
    const decoded: any = fastify.jwt.verify(
      token,
      process.env.JWT_SECRET as any
    );

    // Find the user by ID from the decoded token
    const user = await fastify.prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id:true,
        password:true,
      }
    });

    if (!user) {
      return reply.status(404).send({
        message: translations[language].token.invalidOrExpired,
      });
    }

    // Check if the new password matches the old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return reply.status(400).send({
        message: translations[language].user.passwordSame,
      });
    }

    // Update the user's password (ensure password is hashed!)
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await fastify.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return reply.status(200).send({
      message: translations[language].password.resetSuccess,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};

export const changePasswordNew = async (
  fastify: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply
) => {
  const { token, newPassword, oldPassword }: any = req.body;
  try {
    // Verify the token
    const decoded: any = fastify.jwt.verify(
      token,
      process.env.JWT_SECRET as any
    );
    const {language} = await getUserPreferences(fastify,req,undefined,"auto");

    // Find the user by ID from the decoded token
    const user = await fastify.prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id:true,
        password:true,
      }
    });

    if (!user) {
      return reply.status(404).send({
        message: translations[language].token.invalidOrExpired,
      });
    }

    // Check if the old password matches the old password
    const checkOldPass = await bcrypt.compare(oldPassword, user.password);
    if (!checkOldPass) {
      return reply.status(400).send({
        message: translations[language].user.oldPasswordIncorrect,
      });
    }

    // Check if the new password matches the old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return reply.status(400).send({
        message: translations[language].password.newPasswordSameAsOld,
      });
    }

    // Update the user's password (ensure password is hashed!)
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await fastify.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return reply.status(200).send({
      message: translations[language].password.resetSuccess,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
