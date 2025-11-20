import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { checkUserPoints } from "../../service/checkPoins";
import { getUserPreferences } from "../../service/getLanguageDb";
import { translations } from "../../lib/i18n";
import { verifyEmail } from "../../service/verifyEmail";
import { v7 as uuidv7 } from "uuid";
import { IUser } from "../../types/user";
import { checkForbiddenWords } from "../../service/checkBlockWords";
import {
  forbiddenWordsAbout,
  forbiddenWordsUsername,
} from "../../utils/blocked_words";


const stripBackslash = (val?: string) => {
  if (typeof val !== "string") return val;
  return val.replace(/^\\+/, "").trim();
};

export const createPodcastRequestController = async (
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
      podcastGroupId,
      id_tool,
      name,
      auction_price = 20,
      typeRequest,
      data,
      target
    } = body;

    // Validate name (bắt buộc theo model)
    if (!name || !name.trim()) {
      return reply.status(400).send({ message: "Thiếu trường name" });
    }

    // Validate typeRequest enum
    if (!["register", "post"].includes(typeRequest)) {
      return reply.status(400).send({ message: "typeRequest không hợp lệ" });
    }

    // auction_price validate
    const auctionPriceNum = Number(auction_price ?? 20);
    if (isNaN(auctionPriceNum) || auctionPriceNum < 0) {
      return reply.status(400).send({ message: "Giá trị auction_price không hợp lệ" });
    }

    // target validate
    if (target === undefined || target === null) {
      return reply.status(400).send({ message: "Thiếu trường target" });
    }

    const targetNumber = Number(target);
    if (isNaN(targetNumber) || targetNumber < 0) {
      return reply.status(400).send({ message: "Giá trị target không hợp lệ, phải là số >= 0" });
    }

    let finalPodcastGroupId = podcastGroupId;

    // Points required
    const requiredPoints = auctionPriceNum;

    // REGISTER

    if (typeRequest === "register") {
      const requiredFields = [
        "email",
        "username",
        "appPassword",
        "password",
        "twoFA",
        "avatar"
      ];

      for (const field of requiredFields) {
        if (!data?.[field]) {
          return reply.status(400).send({ message: `Thiếu trường ${field} trong data` });
        }
      }

      if (!isAdmin) {
        const forbiddenCheck = [
          { field: "Username", value: data.Username, words: forbiddenWordsUsername },
        ];

        const forbiddenResult = checkForbiddenWords(forbiddenCheck);
        if (!forbiddenResult.success) {
          return reply.status(400).send({
            message: forbiddenResult.message,
            success: false,
          });
        }
      }


      // Check points
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

      // Verify email + App Password
      const result = await verifyEmail(data.Email, data.AppPassword);
      if (!result.success) {
        return reply.status(400).send({
          message: translations[dataLanguage].services.invalidAppPassword,
          success: false,
        });
      }

      // sanitize
      data.Username = stripBackslash(data.Username);

      // cần generate id podcast group
      finalPodcastGroupId = uuidv7();
    }

    // CASE 2: POST

    if (typeRequest === "post") {
      const requiredFields = [
        "about",
        "website",
        "avatar",
        "phone",
        "address"
      ];

      for (const field of requiredFields) {
        if (!data?.[field]) {
          return reply.status(400).send({ message: `Thiếu trường ${field} trong data` });
        }
      }

      if (!isAdmin) {
        const forbiddenCheck = [
          { field: "about", value: data.About, words: forbiddenWordsAbout },
          { field: "website", value: data.Website, words: forbiddenWordsAbout },
          { field: "address", value: data.Address, words: forbiddenWordsAbout },
        ];

        const forbiddenResult = checkForbiddenWords(forbiddenCheck);
        if (!forbiddenResult.success) {
          return reply.status(400).send({
            message: forbiddenResult.message,
            success: false,
          });
        }
      }

      // blogGroupId must exist
      if (!podcastGroupId) {
        return reply.status(400).send({ message: "Thiếu trường podcastGroupId" });
      }

      const existingGroup = await fastify.prisma.podcastGroup.findUnique({
        where: { id: podcastGroupId },
      });

      if (!existingGroup) {
        return reply.status(404).send({
          message: `Không tìm thấy PodcastGroup với id ${podcastGroupId}`,
          success: false,
        });
      }

      // check points
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

      // sanitize
      data.About = stripBackslash(data.About);
    }

    // CREATE REQUEST

    if (typeRequest === "register") {
      const created = await fastify.prisma.$transaction(async (prisma) => {
        const newGroup = await prisma.podcastGroup.create({
          data: {
            id: finalPodcastGroupId,
            userId,
            name,
            link_rss: "",
            status: "new",
          },
        });

        const newReq = await prisma.podcastRequest.create({
          data: {
            id: uuidv7(),
            userId,
            podcastGroupId: newGroup.id,
            id_tool,
            name,
            typeRequest,
            auction_price: auctionPriceNum,
            target: targetNumber,
            data: JSON.stringify(data),
            status: "draft",
          },
        });

        return { newGroup, newReq };
      });

      return reply.status(201).send({
        message: translations[dataLanguage].common.createSuccess,
        success: true,
        podcast_request: created.newReq,
      });
    }

    // POST TYPE → create only request
    const newPodcastRequest = await fastify.prisma.podcastRequest.create({
      data: {
        id: uuidv7(),
        userId,
        podcastGroupId: finalPodcastGroupId,
        id_tool,
        name,
        typeRequest,
        auction_price: auctionPriceNum,
        target: targetNumber,
        data: JSON.stringify(data),
        status: "draft",
      },
    });

    return reply.status(201).send({
      message: translations[dataLanguage].common.createSuccess,
      success: true,
      podcast_request: newPodcastRequest,
    });

  } catch (err) {
    console.error("Lỗi khi tạo PodcastRequest:", err);
    return reply.status(500).send({ message: "Lỗi khi tạo PodcastRequest", error: err });
  }
};
