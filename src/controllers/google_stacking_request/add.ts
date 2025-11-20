import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { googleStackingRequestSchema } from "../../schema/google_stacking";
import { forbiddenWordsAbout } from "../../utils/blocked_words";
import { checkForbiddenWords } from "../../service/checkBlockWords";
import { checkUserPoints } from "../../service/checkPoins";
import { translations } from "../../lib/i18n";
import { v7 as uuidv7 } from "uuid";
import { IUser } from "../../types/user";
import { Role } from "@prisma/client";
import { createUserActionLog } from "../../utils/userActionLog";


const stripBackslashInHTMLContent = (val?: string) => {
  if (typeof val !== "string") return val;

  // Bỏ tất cả \ ở đầu nội dung của các thẻ HTML (ví dụ: <p>\text</p> => <p>text</p>)
  return val.replace(/(<[^>]+>)\\+/g, '$1').trim();
};

export const createGoogleStackingRequest = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const formData = request.body as Record<string, any>;
    let {
      auction_price,
      about,
      title,
      cover,
      duplicate
    } = formData;

    const user = request.user as IUser
    const { id: userId, language, role, type } = request.user as { id: string; language: string; role: Role; type: string };
    const isAdmin = role === "admin" || userId === "01968ebb-b29c-7356-b54a-696c6ae4fcee" || type === "priority";

    const dataLanguage = language === "auto" ? "vi" : "en"
    // 1. Validate input
    const checkValidate = googleStackingRequestSchema.safeParse(formData);
    if (!checkValidate.success) {
      const allErrors = checkValidate.error.errors.map((err: any) => err.message).join(', ');
      return reply.status(400).send({ message: allErrors });
    }

    about = stripBackslashInHTMLContent(about);

    // 2. Sanitize input
    if (about) {
      about = fastify.sanitize(about);
      title = fastify.sanitize(title);
    }

    // 3. Check forbidden words
    const forbiddenCheck = [
      { field: "about", value: about, words: forbiddenWordsAbout },
    ];

    if (!isAdmin) {
      const forbiddenResult = checkForbiddenWords(forbiddenCheck);
      if (!forbiddenResult.success) {
        return reply.status(400).send({
          message: forbiddenResult.message,
          success: false,
        });
      }
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
    const basePoints = auction_price * siteData.length;
    const totalUsed = basePoints * (duplicate + 1);
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

    const validatedData = checkValidate.data;

    // 5. Prepare data
    const dataReq: any = {
      ...validatedData,
      id: uuidv7(),
      userId,
      about,
      title,
    };

    // 6. Save to DB
    const newRequest = await fastify.prisma.googleStackingRequest.create({
      data: dataReq,
    });

    // ⚡ Tạo mảng ảnh cần cập nhật (có thể có avatar và cover)
    const imageUpdates = [
      cover && { publicId: cover, type: "cover" },
    ].filter(Boolean) as { publicId: string; type: "avatar" | "cover" }[];

    // ⚡ Cập nhật ảnh tương ứng
    await Promise.all(
      imageUpdates.map((img) =>
        fastify.prisma.images.updateMany({
          where: {
            publicId: img.publicId,
            userId: userId,
            imageableId: null, // đảm bảo chưa được liên kết trước đó (nếu cần)
          },
          data: {
            imageableId: newRequest.id,
            imageableType: "googleStacking",
            type: img.type,
          },
        })
      )
    );

    await createUserActionLog({
      fastify,
      request,
      action: 'create',
      resource: 'google_stacking_request',
      resourceId: newRequest.id,
      metadata: {
        title: newRequest.title,
        website: newRequest.website,
        auction_price: newRequest.auction_price,
        totalSites: siteData.length,
        totalPoints: totalUsed,
        duplicate: newRequest.duplicate
      },
    });

    // 7. Return response
    return reply.status(201).send({
      success: true,
      message: translations[dataLanguage].common.createSuccess,
      ggstacking_requests: newRequest,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
