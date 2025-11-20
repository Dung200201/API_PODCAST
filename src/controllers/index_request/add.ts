import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { v7 as uuidv7 } from 'uuid';
import _ from 'lodash';
import { validateUrls } from "../../service/checkUrls";
import { checkUserPoints } from "../../service/checkPoins";
import { Locale, translations } from "../../lib/i18n";
import { IIndexRequestCreate } from "../../types";
import { IUser } from "../../types/user";

// Hàm tạo data
export const createIndexRequest = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: IIndexRequestCreate }>,
  reply: FastifyReply
) => {
  try {
    const { checking, time_zone, filter } = request.body;
    const user = request.user as IUser;
    const { source, type, language: dataLanguage } = request.user as { language: Locale, source: string, type: string };
    const { id: userId } = request.user as { id: string };
    let urls: string[] = [];

    if (Array.isArray(request.body.urls)) {
      urls = _.uniq(request.body.urls.map((url) => url.trim()));
    } else if (typeof request.body.urls === "string") {
      urls = [request.body.urls.trim()];
    } else {
      urls = [];
    }

    // Check url gửi lên
    const formCheckUrl = {
      urls,
      maxUrls: 11000,
      language: dataLanguage,
    }
    const checkUrls: any = validateUrls(formCheckUrl);

    if (!checkUrls.success) {
      return reply.status(400).send({
        message: checkUrls.message,
        success: false,
        urls: checkUrls?.invalidUrls
      });
    }

    let totalUsed = type === "normal" ?
      checkUrls.validUrls.length :
      type === "advanced" ?
        checkUrls.validUrls.length * 2 :
        checkUrls.validUrls.length * 3;

    // 4. check điểm người dùng Truy vấn DB để lấy thông tin điểm trong bảng giao dịch
    const checkPoints = await checkUserPoints(
      fastify,
      user,
      totalUsed
    );

    if (!checkPoints.isEnough) {
      return reply.status(401).send({
        data: checkPoints,
        message: `${translations[dataLanguage].points.notEnough_prefix} ${checkPoints.neededPoints} ${translations[dataLanguage].points.notEnough_suffix}`,
        success: false,
      });
    }

    // Xử lý thời gian theo múi giờ người dùng
    const currentTimeInUserTimezone = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
      timeZone: time_zone || "UTC",
    }).format(new Date());

    // Tạo index request trong database
    let urlsToInsert = checkUrls.validUrls;

    if (filter) {
      const existingLinks = await fastify.prisma.indexLink.findMany({
        where: {
          url: { in: urlsToInsert },
          indexRequest: { userId },
        },
        select: { url: true }
      });

      const existingUrlsSet = new Set(existingLinks.map(link => link.url));
      urlsToInsert = urlsToInsert.filter((url: any) => !existingUrlsSet.has(url));
    }

    if (urlsToInsert.length === 0) {
      return reply.status(400).send({
        message: "Invalid urls", // hoặc chuỗi bạn muốn
        success: false,
      });
    }

    // Tạo tên mặc định nếu không có tên
    const totalLinks = urlsToInsert.length;
    const defaultName = `Total ${totalLinks} ${totalLinks > 1 ? "links" : "link"} - at - ${currentTimeInUserTimezone}`;

    // Loại bỏ ký tự không mong muốn
    const sanitizedName = defaultName.replace(/[/]/g, '/');

    // Đến đây chắc chắn đã có ít nhất 1 link cần insert -> mới tạo indexRequest
    const newIndexRequest: any = await fastify.prisma.indexRequest.create({
      data: {
        id: uuidv7(),
        userId: userId,
        name: sanitizedName,
        status: checking ? "new" : "running",
      }
    });

    // Chỉ thêm URL nếu có index request mới
    if (newIndexRequest) {

      const insertData = urlsToInsert.map((url: string) => ({
        id: uuidv7(),
        indexRequestId: newIndexRequest.id,
        url,
        source: source === "api" ? "api" : "web"
      }));

      // Chèn danh sách URL vào database
      const insertResult = await fastify.prisma.indexLink.createMany({
        data: insertData,
        skipDuplicates: true,
      });

      // Tính điểm dựa trên số link đã insert
      const pointsEarned = type === "normal" ?
        insertResult.count :
        type === "advanced" ?
          insertResult.count * 2 :
          insertResult.count * 3;

      if (!checking) {
        // Trừ điểm nếu không cần kiểm tra link
        await fastify.prisma.transaction.create({
          data: {
            id: uuidv7(),
            userId: userId,
            type: "debit",
            reference: `${newIndexRequest.id}`,
            service: "indexing",
            description: `You used ${pointsEarned} points for ${insertResult.count} links in index service`,
            points: pointsEarned * 2,
            status: true,
          },
        });
      }
    }
    newIndexRequest.deletedAt = undefined;

    // Trả về kết quả
    return reply
      .status(201)
      .send({
        message: `Tạo dữ liệu thành công`,
        success: true,
        indexRequest: newIndexRequest,
        urls: checkUrls?.invalidUrls
      });
  } catch (error) {
    console.log("error", error);
    handleErrorResponse(reply, error); // Hàm xử lý lỗi
  }
};
