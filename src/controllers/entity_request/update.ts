import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import dotenv from "dotenv";
import { verifyEmail } from "../../service/verifyEmail";
import {
  forbiddenWordsAbout,
  forbiddenWordsName,
  forbiddenWordsUsername,
} from "../../utils/blocked_words";
import { checkForbiddenWords } from "../../service/checkBlockWords";
import { getUserPreferences } from "../../service/getLanguageDb";
import { translations } from "../../lib/i18n";
import { checkUserPoints } from "../../service/checkPoins";
import { IUser } from "../../types/user";
import { entityRequestUpdateSchema } from "../../schema/entity_request";
dotenv.config();

const stripBackslash = (val?: string) => {
  if (typeof val !== "string") return val;

  // Bỏ toàn bộ dấu '\' ở đầu chuỗi, bất kể có bao nhiêu cái
  return val.replace(/^\\+/, "").trimStart();
};

const stripBackslashInHTMLContent = (val?: string) => {
  if (typeof val !== "string") return val;

  // Bỏ tất cả \ ở đầu nội dung của các thẻ HTML (ví dụ: <p>\text</p> => <p>text</p>)
  return val.replace(/(<[^>]+>)\\+/g, '$1').trim();
};


export const updateEntityRequest = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: { id: string }; Body: any }>,
  reply: FastifyReply
) => {
  try {
    const { id } = request.params;
    const formData = request.body as Record<string, any>;
    const { ...updateData } = formData;
    const user = request.user as IUser
    let {
      entity_email,
      id_tool,
      app_password,
      entity_limit,
      fixed_sites,
      about,
      username,
      checkedAt,
      first_name,
      last_name,
      status,
      password,  // ← Thêm
      twofa
    } = updateData;

    const { id: userId, role, type } = request.user as { id: string; role: string; type: string };
    const isAdmin = ["admin", "dev"].includes(role) || type === "priority";

    // Lấy ngôn ngữ hiện tại của người dùng
    const { language: dataLanguage } = await getUserPreferences(
      fastify,
      request,
      userId
    );

    // 📌 **Lấy request cũ từ database**
    const existingRequest: any = await fastify.prisma.entityRequest.findUnique({
      where: !isAdmin
        ? { id: id, userId, deletedAt: null }
        : { id: id, deletedAt: null },
    });

    if (!existingRequest) {
      return reply
        .status(404)
        .send({ message: "Request not found", success: false });
    }

    if (Object.keys(updateData).length === 0) {
      return reply
        .status(400)
        .send({ message: "No data provided for update", success: false });
    }

    // ⚡ **Xử lý riêng cho admin update status**
    if (id_tool && status && isAdmin) {
      await fastify.prisma.entityRequest.update({
        where: { id },
        data: {
          status: status,
          checkedAt: checkedAt,
          id_tool: id_tool,
          updatedAt: new Date(),
        },
      });
      return reply.status(200).send({
        success: true,
        message: "Request updated successfully",
      });
    }

    const maxFixedSites = 550;
    if (fixed_sites && typeof fixed_sites === "string") {
      fixed_sites =
        fixed_sites && fixed_sites.length
          ? fixed_sites
            .split(";")
            .map((site: string) => site.trim())
            .slice(0, maxFixedSites)
          : undefined;

      if (fixed_sites && fixed_sites.length > 0) {
        updateData.entity_limit = fixed_sites.length;
      } else {
        updateData.entity_limit = entity_limit || 0;
      }
    }

    if (!isAdmin) {
      // 1. Validate dữ liệu đầu vào:
      const checkValidate = entityRequestUpdateSchema.safeParse(formData);
      if (!checkValidate.success) {
        const allErrors = checkValidate.error.errors
          .map((err: any) => err.message)
          .join(", ");
        return reply.status(400).send({
          message: allErrors,
        });
      }
    }

    about = stripBackslashInHTMLContent(about);
    first_name = stripBackslash(first_name);
    last_name = stripBackslash(last_name);

    if (about) {
      about = fastify.sanitize(about);
    }

    // Kiểm tra xem có phải yêu cầu là Social
    if (id_tool === "Social") {
      const dataSocial = await fastify.prisma.site.findMany({
        where: {
          status: "running",
          type: {
            in: ["accountSocial", "social_accountSocial"],
          },
        },
        select: {
          domain: true,
        },
      });

      const dataMap = dataSocial?.map((item) => item.domain);
      updateData.fixed_sites = dataMap.join(";");
      updateData.entity_limit = dataSocial.length;
      updateData.auction_price = 45;
    }

    // 🛡️ **Giới hạn entity_limit tối đa 400**
    const maxEntityLimit = 400;
    if (!isAdmin && !fixed_sites && entity_limit > maxEntityLimit) {
      return reply.status(400).send({
        message:
          translations[dataLanguage].services.entityLimitMax +
          " " +
          maxEntityLimit,
        success: false,
      });
    }

    // 🛑 **Kiểm tra từ bị cấm**
    const forbiddenCheck = [
      { field: "about", value: about, words: forbiddenWordsAbout },
      { field: "username", value: username, words: forbiddenWordsUsername },
      { field: "first_name", value: first_name, words: forbiddenWordsName },
      { field: "last_name", value: last_name, words: forbiddenWordsName },
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
    // 🔥 **Kiểm tra điểm người dùng**
    // 🔥 **Kiểm tra điểm người dùng (hỗ trợ isAdmin charge theo chủ request)**
    if (
      (typeof entity_limit !== "undefined" && entity_limit !== existingRequest.entity_limit) ||
      (typeof updateData.auction_price !== "undefined" && updateData.auction_price !== existingRequest.auction_price) ||
      (typeof updateData.entity_limit !== "undefined" && updateData.entity_limit !== existingRequest.entity_limit)
    ) {
      // Lấy giá trị sau cập nhật (ưu tiên updateData/fixed_sites đã xử lý ở trên)
      const effectiveAuctionPrice =
        typeof updateData.auction_price !== "undefined"
          ? updateData.auction_price
          : (existingRequest.auction_price ?? 0);

      const effectiveEntityLimit =
        typeof updateData.entity_limit !== "undefined"
          ? updateData.entity_limit
          : (typeof entity_limit !== "undefined" ? entity_limit : (existingRequest.entity_limit ?? 0));

      const totalUsed = Number(effectiveAuctionPrice) * Number(effectiveEntityLimit);

      // Chọn user cần kiểm tra điểm
      let chargeUser: IUser = user;
      if (isAdmin) {
        // Lấy user chủ của entityRequest (người sẽ bị trừ điểm)
        const targetUser = await fastify.prisma.user.findUnique({
          where: { id: existingRequest.userId },
        });

        if (!targetUser) {
          return reply.status(404).send({
            message: "Target user not found",
            success: false,
          });
        }

        chargeUser = targetUser as any;
      }

      const checkPoints = await checkUserPoints(fastify, chargeUser, totalUsed);

      if (!checkPoints.isEnough) {
        return reply.status(401).send({
          message: `${translations[dataLanguage].services.needMorePointsFirst} ${checkPoints.neededPoints} ${translations[dataLanguage].services.needMorePointsSecond}`,
          success: false,
        });
      }
    }

    if (entity_email && app_password) {
      // 5. Kiểm tra email và app password
      const result = await verifyEmail(entity_email, app_password);
      if (!result.success) {
        return reply
          .status(401)
          .send({
            message: translations[dataLanguage].services.invalidAppPassword,
            success: false,
          });
      }
    }

    if (Array.isArray(updateData.fixed_sites)) {
      updateData.fixed_sites = updateData.fixed_sites.join(";");
    }

    delete updateData.avatar;
    delete updateData.cover;

    const currentData = existingRequest.data || {};

    // Chỉ cập nhật nếu có giá trị mới
    if (password !== undefined || twofa !== undefined) {
      updateData.data = {
        ...currentData,
        ...(password !== undefined && { password }),
        ...(twofa !== undefined && { twofa }),
      };
    }

    // Xóa password và twofa khỏi root level
    delete updateData.password;
    delete updateData.twofa;

    // ✅ **Kiểm tra xem có thay đổi gì không**
    const hasChanges = Object.keys(updateData).some(
      (key) => {
        if (key === 'data') {
          return JSON.stringify(updateData[key]) !== JSON.stringify(existingRequest[key]);
        }
        return updateData[key] !== existingRequest[key];
      }
    );

    if (!hasChanges) {
      return reply
        .status(200)
        .send({ message: "No changes detected", success: true });
    }

    // ✅ **CÂU LỆNH UPDATE VÀO DATABASE**
    await fastify.prisma.entityRequest.update({
      where: { id },
      data: {
        ...updateData,
        about,
        first_name,
        last_name,
        updatedAt: new Date(),
      },
    });

    return reply.status(200).send({
      success: true,
      message: "Request updated successfully",
    });
    // }
  } catch (error) {
    console.log(error);
    handleErrorResponse(reply, error);
  }
};
