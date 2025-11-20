import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getUserPreferences } from "../../service/getLanguageDb";
import { googleStackingRequestSchema } from "../../schema/google_stacking";
import { forbiddenWordsAbout } from "../../utils/blocked_words";
import { checkForbiddenWords } from "../../service/checkBlockWords";
import { translations } from "../../lib/i18n";
import { createUserActionLog } from "../../utils/userActionLog";
import { checkUserPoints } from "../../service/checkPoins";
import { IUser } from "../../types/user";

const stripBackslashInHTMLContent = (val?: string) => {
  if (typeof val !== "string") return val;

  // Bỏ tất cả \ ở đầu nội dung của các thẻ HTML (ví dụ: <p>\text</p> => <p>text</p>)
  return val.replace(/(<[^>]+>)\\+/g, '$1').trim();
};

export const updateGoogleStackingRequest = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string }; Body: Record<string, any> }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const formData = request.body;
    const user = request.user as IUser
    const { id: userId, role, type } = request.user as { id: string; role: string; type: string };
    const isAdmin =
      (role === "admin") ||
      (role === "dev") || userId === "01968ebb-b29c-7356-b54a-696c6ae4fcee" || type === "priority";
    const { language: dataLanguage } = await getUserPreferences(fastify, request, userId);

    // Validate input
    const validate = googleStackingRequestSchema.partial().safeParse(formData);
    if (!validate.success) {
      const allErrors = validate.error.errors.map((err: any) => err.message).join(', ');
      return reply.status(400).send({ message: allErrors });
    }

    // Kiểm tra bản ghi có tồn tại và thuộc về user không
    const existing = await fastify.prisma.googleStackingRequest.findUnique({
      where: !isAdmin ? { id: id, userId } : { id: id },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        message: translations[dataLanguage].common.notFound,
      });
    }

    // Lấy data từ bảng site add vào bảng gg stacking link
    const siteData = await fastify.prisma.site.findMany({
      where: {
        type: "googleStacking",
        status: "running"
      },
      select: {
        domain: true
      }
    });

    if (siteData.length === 0) {
      return reply.status(400).send({
        success: false,
        message: "No site data found to create stacking links.",
      });
    }

    // 4. Check user points
    const basePoints = existing.auction_price * siteData.length;
    const totalUsed = basePoints * (existing.duplicate + 1);
    const checkPoints = await checkUserPoints(fastify, user, totalUsed);

    if (checkPoints.isExpired) {
      return reply.status(401).send({
        message: translations[dataLanguage].services.expiredPoints,
        success: false,
      });
    }

    if (!checkPoints.isEnough) {
      return reply.status(401).send({
        message: `${translations[dataLanguage].services.needMorePointsFirst} ${checkPoints.neededPoints} ${translations[dataLanguage].services.needMorePointsSecond}`,
        success: false,
      });
    }

    // Sanitize & kiểm tra từ cấm
    let { about, title } = formData;
    about = stripBackslashInHTMLContent(about);

    if (about) {
      about = fastify.sanitize(about);
      title = fastify.sanitize(title);
      if (!isAdmin) {
        const forbiddenCheck = [{ field: "about", value: about, words: forbiddenWordsAbout }];
        const forbiddenResult = checkForbiddenWords(forbiddenCheck);
        if (!forbiddenResult.success) {
          return reply.status(400).send({
            message: forbiddenResult.message,
            success: false,
          });
        }
      }
    }

    const dataReq: any = {
      ...validate.data,
      about,
      title,
      updatedAt: new Date(), // update timestamp
    }

    const updatedRequest = await fastify.prisma.googleStackingRequest.update({
      where: { id },
      data: dataReq,
    });

    await createUserActionLog({
      fastify,
      request,
      action: 'update',
      resource: 'google_stacking_request',
      resourceId: updatedRequest.id,
      metadata: {
        title: updatedRequest.title,
        website: updatedRequest.website,
        auction_price: updatedRequest.auction_price,
        duplicate: updatedRequest.duplicate
      },
    });

    return reply.status(200).send({
      success: true,
      message: translations[dataLanguage].common.updateSuccess,
      ggstacking_request: updatedRequest,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
