import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import {
  forbiddenWordsAbout,
  forbiddenWordsName,
  forbiddenWordsUsername,
} from "../../utils/blocked_words";
import { verifyEmail } from "../../service/verifyEmail";
import { checkUserPoints } from "../../service/checkPoins";
import { entityRequestCreateSchema } from "../../schema/entity_request";
import { checkForbiddenWords } from "../../service/checkBlockWords";
import { v7 as uuidv7 } from "uuid";
import { getUserPreferences } from "../../service/getLanguageDb";
import { translations } from "../../lib/i18n";
import { Role, Type } from "@prisma/client";
import { IUser } from "../../types/user";

// 1. validate các trường
// 2. check điểm của khách hàng
// 3. check email và mật khẩu ứng dụng (Đối với trường hợp chọn chọn default thì set mặc định tài khoản bên mình cho khách hàng)
// 4. Check các từ bị cấm khi điền form gửi lên (Chức năng này hoạt động đối với ngôn ngữ tiếng việt)
// 5. Check tối đa khách hàng họ có thể điền fixed max - 50 (Trong vòng 24 giờ chỉ được phép tạo 3 lần fixed)
// 6. Check người dùng nếu tạo tài khoản social thì sẽ là min 15 điểm

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


export const createRequestController = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    let {
      entity_email,
      id_tool,
      app_password,
      entity_limit,
      auction_price,
      fixed_sites,
      about,
      username,
      first_name,
      last_name,
      avatar,
      cover,
      password,  // ← Thêm
      twofa
    } = request.body as any;
    const formData = request.body as Record<string, any>;
    const user = request.user as IUser
    const { id: userId, role, type } = request.user as { id: string; role: Role; type: Type };

    const isAdmin = role === "admin" || userId === "01968ebb-b29c-7356-b54a-696c6ae4fcee" || type === "priority";

    // Lấy ngôn ngữ hiện tại của người dùng
    const { language: dataLanguage } = await getUserPreferences(fastify, request, userId);

    // Xử lý fixed_sites
    const maxFixedSites = 550;
    fixed_sites = fixed_sites && fixed_sites.length
      ? fixed_sites.split(';').map((site: string) => site.trim()).slice(0, maxFixedSites)
      : undefined;

    if (fixed_sites && fixed_sites.length > 0) {
      entity_limit = fixed_sites.length;
    } else {
      entity_limit = entity_limit || 0;
    }

    // 1. Validate dữ liệu đầu vào:
    const checkValidate: any = entityRequestCreateSchema.safeParse(formData);
    if (!checkValidate.success) {
      const allErrors = checkValidate.error.errors.map((err: any) => err.message).join(', ');
      return reply.status(400).send({
        message: allErrors,
      });
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
            in: ["accountSocial", "social_accountSocial"]
          }
        },
        select: {
          domain: true
        }
      })

      const dataMap = dataSocial?.map((item) => item.domain);
      fixed_sites = dataMap;
      entity_limit = dataSocial.length;
      auction_price = 45;
    }

    const maxEntityLimit = 400
    // 2. Giới hạn entity_limit tối đa 400
    if (!isAdmin && !fixed_sites && entity_limit > maxEntityLimit) {
      return reply.status(401).send({
        message: translations[dataLanguage].services.needMorePointsFirst + " " + maxEntityLimit,
        success: false,
      });
    }

    // Check nếu như khách hàng họ có đẩy fixed web site lên thì check trc
    // 3. Kiểm tra từ bị cấm
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
          message: forbiddenResult?.message,
          success: false,
        });
      }
    }

    // 4. check điểm người dùng Truy vấn DB để lấy thông tin điểm trong bảng giao dịch
    const totalUsed = auction_price * entity_limit;
    const checkPoints = await checkUserPoints(
      fastify,
      user,
      totalUsed
    );

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

    // 5. Kiểm tra email và app password
    const result = await verifyEmail(entity_email, app_password);
    if (!result.success) {
      return reply
        .status(401)
        .send({ message: translations[dataLanguage].services.invalidAppPassword, success: false });
    }

    console.log("formData", formData);
    

    const dataReq: any = {
      id: uuidv7(),
      userId,
      entity_email,
      app_password,
      ...formData, // Giữ lại các dữ liệu khác
      id_tool,
      entity_limit,
      auction_price,
      about,
      first_name,
      last_name,
      fixed_sites: fixed_sites?.join(";") ?? undefined,
      avatar: undefined,
      cover: undefined,
      data: {
        password: password || null,
        twofa: twofa || null,
      },
    };

    dataReq.force_create = undefined;
    dataReq.password = undefined; 
    dataReq.twofa = undefined;

    // 7. **Tạo request mới**
    const newEntityRequest: any = await fastify.prisma.entityRequest.create({
      data: dataReq,
    });

    // ⚡ Tạo mảng ảnh cần cập nhật (có thể có avatar và cover)
    const imageUpdates = [
      avatar && { publicId: avatar, type: "avatar" },
      cover && { publicId: cover, type: "cover" },
    ].filter(Boolean) as { publicId: string; type: "avatar" | "cover" }[];

    await Promise.all(
      imageUpdates.map((img) =>
        fastify.prisma.images.updateMany({
          where: {
            publicId: img.publicId,
            userId: userId,
            imageableId: null,
          },
          data: {
            imageableId: newEntityRequest.id,
            imageableType: "entity",
            type: img.type,
          },
        })
      )
    );

    return reply.status(201).send({
      message: `${translations[dataLanguage].common.createSuccess}`,
      success: true,
    });
  } catch (error) {
    console.log(error);
    handleErrorResponse(reply, error);
    return;
  }
};
