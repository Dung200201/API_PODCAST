import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { checkUserPoints } from "../../service/checkPoins";
import { checkForbiddenWords } from "../../service/checkBlockWords";
import { verifyEmail } from "../../service/verifyEmail";
import {
  forbiddenWordsAbout,
  forbiddenWordsUsername,
} from "../../utils/blocked_words";
import { getUserPreferences } from "../../service/getLanguageDb";
import { translations } from "../../lib/i18n";
import { v7 as uuidv7 } from "uuid";
import { IUser } from "../../types/user";

const stripBackslash = (val?: string) => {
  if (typeof val !== "string") return val;
  return val.replace(/^\\+/, "").trim();
};

export const createBlog20RequestController = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const user = request.user as IUser;
    if (!user?.id) {
      return reply.status(401).send({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }

    const { id: userId, role, type } = user;
    const isAdmin = role === "admin" || type === "priority";

    const { language: dataLanguage } = await getUserPreferences(fastify, request, userId);

    const body = request.body as Record<string, any>;
    let {
      blogGroupId,
      id_tool,
      name,
      auction_price = 20,
      typeRequest,
      data,
      target
    } = body;

    // basic validation
    if (!typeRequest) {
      return reply.status(400).send({ message: "Thiếu trường typeRequest" });
    }

    // ensure auction_price is number
    const auctionPriceNum = Number(auction_price ?? 20);
    if (isNaN(auctionPriceNum) || auctionPriceNum < 0) {
      return reply.status(400).send({ message: "Giá trị auction_price không hợp lệ" });
    }

    // đảm bảo target hợp lệ khi dùng
    // nếu không truyền target -> mặc định 0
    const targetNumber = Number(target ?? 0);
    if (isNaN(targetNumber) || targetNumber < 0) {
      return reply.status(400).send({ message: "Giá trị target không hợp lệ, phải là số >= 0" });
    }

    let finalBlogGroupId = blogGroupId;

    // compute required points (ví dụ: auctionPriceNum) — chỉnh theo business logic thật của bạn
    const requiredPoints = auctionPriceNum;

    // CASE register
    if (typeRequest === "register") {
      const requiredFields = [
        "email",
        "password_email",
        "twoFa",
        "app_password",
        "username",
        "image_link",
        "title",
        "about",
        "password"
      ];
      for (const field of requiredFields) {
        if (!data?.[field]) {
          return reply.status(400).send({ message: `Thiếu trường ${field} trong data` });
        }
      }

      if (!isAdmin) {
        const forbiddenCheck = [
          { field: "username", value: data.username, words: forbiddenWordsUsername },
          { field: "title", value: data.title, words: forbiddenWordsAbout },
          { field: "about", value: data.about, words: forbiddenWordsAbout },
        ];
        const forbiddenResult = checkForbiddenWords(forbiddenCheck);
        if (!forbiddenResult.success) {
          return reply.status(400).send({
            message: forbiddenResult.message,
            success: false,
          });
        }
      }

      // check points with requiredPoints
      const checkPoints = await checkUserPoints(fastify, user, requiredPoints);
      if (checkPoints.isExpired) {
        return reply.status(403).send({
          message: translations[dataLanguage].services.expiredPoints,
          success: false,
        });
      }
      if (!checkPoints.isEnough) {
        return reply.status(403).send({
          message: `${translations[dataLanguage].services.needMorePointsFirst} ${checkPoints.neededPoints} ${translations[dataLanguage].services.needMorePointsSecond}`,
          success: false,
        });
      }

      const result = await verifyEmail(data.email, data.app_password);
      if (!result.success) {
        return reply.status(400).send({
          message: translations[dataLanguage].services.invalidAppPassword,
          success: false,
        });
      }

      data.username = stripBackslash(data.username);
      data.about = stripBackslash(data.about);
      data.title = stripBackslash(data.title);

      // create group and request transactionally later
      finalBlogGroupId = uuidv7(); // pre-generate id to use inside transaction
    }

    // CASE post
    else if (typeRequest === "post") {
      const { type_content } = data || {};
      if (!type_content) {
        return reply.status(400).send({ message: "Thiếu trường type_content trong data" });
      }

      let requiredFields: string[] = [];
      if (type_content === "AI") {
        requiredFields = [
          "topic",
          "keyword",
          "text_link",
          "URL",
          "image_link",
          "text_lenght",
          "language",
          "type_content",
          "image_quality"
        ];
      } else if (type_content === "manual") {
        requiredFields = ["title", "content", "type_content"];
      } else {
        return reply.status(400).send({
          message: `Giá trị type_content không hợp lệ: ${type_content}. Chỉ hỗ trợ 'AI' hoặc 'manual'`,
        });
      }

      for (const field of requiredFields) {
        if (!data?.[field]) {
          return reply.status(400).send({ message: `Thiếu trường ${field} trong data` });
        }
      }

      if (!blogGroupId) {
        return reply.status(400).send({ message: "Thiếu trường blogGroupId cho typeRequest = post" });
      }

      const existingGroup = await fastify.prisma.blog20Group.findUnique({
        where: { id: blogGroupId },
      });

      if (!existingGroup) {
        return reply.status(404).send({
          message: `Không tìm thấy BlogGroup với id ${blogGroupId}`,
          success: false,
        });
      }

      // check points for post as well
      const checkPoints = await checkUserPoints(fastify, user, requiredPoints);
      if (checkPoints.isExpired) {
        return reply.status(403).send({
          message: translations[dataLanguage].services.expiredPoints,
          success: false,
        });
      }
      if (!checkPoints.isEnough) {
        return reply.status(403).send({
          message: `${translations[dataLanguage].services.needMorePointsFirst} ${checkPoints.neededPoints} ${translations[dataLanguage].services.needMorePointsSecond}`,
          success: false,
        });
      }

      if (!isAdmin) {
        const forbiddenCheck = [
          { field: "topic", value: data.topic, words: forbiddenWordsAbout },
          { field: "keyword", value: data.keyword, words: forbiddenWordsAbout },
        ];
        const forbiddenResult = checkForbiddenWords(forbiddenCheck);
        if (!forbiddenResult.success) {
          return reply.status(400).send({
            message: forbiddenResult.message,
            success: false,
          });
        }
      }

      if (type_content === "AI") {
        data.topic = stripBackslash(data.topic);
        data.keyword = stripBackslash(data.keyword);
      } else if (type_content === "manual") {
        data.title = stripBackslash(data.title);
        data.content = stripBackslash(data.content);
      }
    } else {
      return reply.status(400).send({
        message: "Hiện chỉ hỗ trợ typeRequest = register hoặc post",
      });
    }

    // --- Create records in a transaction ---
    // If a new group needs to be created (register), do both group + request in one tx
    if (typeRequest === "register") {
      const created = await fastify.prisma.$transaction(async (prisma) => {
        const newGroup = await prisma.blog20Group.create({
          data: {
            id: finalBlogGroupId,
            userId,
            name: name || "New Blog Group",
            status: "new",
          },
        });

        const newReq = await prisma.blog20Request.create({
          data: {
            id: uuidv7(),
            userId,
            blogGroupId: newGroup.id,
            id_tool,
            name,
            typeRequest,
            auction_price: auctionPriceNum,
            target: Number(targetNumber ?? 0),
            data: JSON.stringify(data),
            status: "draft",
          },
        });

        // (Optional) here you may also create a points transaction or reduce points in same tx

        return { newGroup, newReq };
      });

      return reply.status(201).send({
        message: translations[dataLanguage].common.createSuccess,
        success: true,
        blog20_request: created.newReq,
      });
    }

    // else (post) -> only create request
    const newBlog20Request = await fastify.prisma.blog20Request.create({
      data: {
        id: uuidv7(),
        userId,
        blogGroupId: finalBlogGroupId,
        id_tool,
        name,
        typeRequest,
        auction_price: auctionPriceNum,
        target: Number(targetNumber ?? 0),
        data: JSON.stringify(data),
        status: "draft",
      },
    });

    return reply.status(201).send({
      message: translations[dataLanguage].common.createSuccess,
      success: true,
      blog20_request: newBlog20Request,
    });

  } catch (error) {
    console.error("Lỗi khi tạo Blog20Request:", error);
    handleErrorResponse(reply, error);
  }
};
