import bcrypt from 'bcrypt';
import { userSchema } from "../../schema/user";
import { IUser } from "../../types/user";
import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getUserPreferences } from '../../service/getLanguageDb';
import { translations } from '../../lib/i18n';

interface Params {
  id: string;
}

export const updateUser = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) => {
  try {
    const formData = request.body as IUser;
    const { status, role, type,  phone, company, username, language, newPassword, oldPassword }:any = formData;
    const id = request.params.id

    // Validate input
    const checkValidate:any = userSchema.safeParse(formData);

    if (!checkValidate.success) {
      const allErrors = checkValidate.error.errors.map((err:any) => err.message).join(', ');
      return reply.status(400).send({
        message: allErrors,
      });
    }

    // Check if user exists
    const user:any = await fastify.prisma.user.findUnique({
      where: { id, deletedAt: null  },
      include: { 
        profile: {
          select: {
            language:true,
            role:true,
            type:true,
            phone:true,
            company:true,
          }
        } 
      }, 
    });

    const {language:dataLanguage} = await getUserPreferences(fastify,request,undefined,user?.profile?.language || "auto");

    if (!user) {
      return reply.status(404).send({
        message: `${translations[dataLanguage].user.notFound}`,
        success: false,
      });
    }
    // Kiểm tra username đã tồn tại nhưng phải bỏ qua user có id hiện tại
    const existingUser = await fastify.prisma.profile.findFirst({
      where: {
          username: username,
          userId: { not: id } // Bỏ qua user hiện tại
      }
    });

    if (existingUser) {
        return reply.status(400).send({
            message: `${translations[dataLanguage].user.usernameTaken}`,
            success: false,
        });
    }

    let updatedPassword = user.password;
    if(newPassword && oldPassword){
      const checkOldPass = await bcrypt.compare(oldPassword, user.password);
      if (!checkOldPass) {
        return reply.status(400).send({
          message: `${translations[dataLanguage].user.oldPasswordIncorrect}`,
        });
      }

      // Check if the new password matches the old password
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return reply.status(400).send({
          message: `${translations[dataLanguage].user.passwordSame}`,
        });
      }

      const salt = await bcrypt.genSalt(10);
      // Update the user's password (ensure password is hashed!)
      updatedPassword = await bcrypt.hash(newPassword, salt);
    }

    // Check if data is the same 
    const isDataSame =
      user.status === status &&
      user.profile?.username === username &&
      user.profile?.role === role &&
      user.profile?.type === type &&
      user.profile?.phone === phone &&
      user.profile?.company === company &&
      user.profile?.language === language;
      // user.password = undefined
      
    if (isDataSame) {
      return reply.status(200).send({
        message: `${translations[dataLanguage].user.noChanges}`,
        success: true,
        user,
      });
    }

    // Use transaction to update user and profile at the same time
    const [updatedUser, updatedProfile]:any = await fastify.prisma.$transaction([
      fastify.prisma.user.update({
        where: { id },
        data: { status, password: updatedPassword },
      }),
      fastify.prisma.profile.update({
        where: { userId: id },
        data: { role, type,  phone, company, username, language },
      }),
    ]);

    updatedUser.password = undefined

    // Return the updated user object with profile included
    return reply.status(200).send({
      message: `${translations[dataLanguage].user.updateSuccess}`,
      success: true,
      user: { ...updatedUser, profile: updatedProfile },
    });

  } catch (error) {
    handleErrorResponse(reply, error);
  }
};

