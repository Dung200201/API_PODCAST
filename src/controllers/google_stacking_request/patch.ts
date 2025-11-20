import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { google } from "googleapis";
import { v7 as uuidv7 } from "uuid";
import { translations } from "../../lib/i18n";
import { checkUserPoints } from "../../service/checkPoins";

const KEYFILEPATH = 'google-api-key.json'
const scopes = ['https://www.googleapis.com/auth/drive'];

export const updateGoogleStackingStatus = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply,
) => {
  try {
    const user = request.user
    const { id } = request.params;
    const { id: userId, role, language } = request.user as { id: string, role: string, language: string };
    const isAdmin =
      (role === "admin") ||
      (role === "dev");
    const { status } = request.body;
    const parentId = '1l7oDZr4-NCIHBD4y1BHHHacQ2ZGt6rZK';
    const dataLanguage = language === "auto" ? "vi" : "en"
    // 1. Check quyền
    const whereCondition = isAdmin
      ? { id, deletedAt: null }
      : { id, userId, deletedAt: null };

    // Tìm ggStacking trước
    const ggStackingRequest = await fastify.prisma.googleStackingRequest.findFirst({
      where: whereCondition,
      select: {
        id: true,
        about: true,
        spin_content: true,
        auction_price: true,
        ggStackingLinks: {
          select: {
            id: true
          }
        }
      }
    });

    if (!ggStackingRequest) {
      return reply.status(404).send({
        message: "Google Stacking not found or already deleted.",
        success: false,
      });
    }

    // 4. Check user points
    const totalUsed = ggStackingRequest.auction_price * ggStackingRequest.ggStackingLinks.length;
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


    const checkImage = await fastify.prisma.images.findFirst({
      where: {
        imageableId: ggStackingRequest.id,
      },
      select: {
        id: true,
      }
    });

    if (!checkImage) {
      return reply.status(404).send({
        message: "Cover is requered.",
        success: false,
      });
    }

    // Lấy data từ bảng site add vào bảng gg stacking link
    const siteData = await fastify.prisma.site.findMany({
      where: { type: "googleStacking", status: "running" },
      select: { domain: true }
    });

    if (siteData.length === 0) {
      return reply.status(400).send({
        success: false,
        message: "No site data found to create stacking links.",
      });
    }

    // 3. Tạo folder Drive
    const folderId = await createDriveFolder(ggStackingRequest.id, parentId);

    if (!folderId) {
      return reply.status(500).send({
        message: "Failed to create Google Drive folder. Please try again later.",
        success: false,
      });
    }

    // 4. Chuẩn bị data để insert
    const googleStackingLinks: any = siteData.map((site) => ({
      id: uuidv7(),
      ggStackingRequestId: ggStackingRequest.id,
      link_post: '',
      note: '',
      about: ggStackingRequest?.spin_content === "always" ? ggStackingRequest.about : fastify.spinText(ggStackingRequest.about),
      site: site.domain,
    }));

    // 5. Cập nhật DB trong transaction
    await fastify.prisma.$transaction([
      fastify.prisma.googleStackingRequest.update({
        where: { id },
        data: { status, folder_url: `https://drive.google.com/drive/folders/${folderId}` },
      }),
      fastify.prisma.googleStackingLink.createMany({ data: googleStackingLinks }),
    ]);

    return reply.status(200).send({
      message: `Status updated to ${status} successfully.`,
      success: true,
    });
  } catch (error: any) {
    console.log("error", error);
    
    handleErrorResponse(reply, error);
  }
};

export async function createDriveFolder(folderName: string, parentId: string): Promise<string | null> {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes,
  });
  const drive = google.drive({ version: 'v3', auth });

  // Tạo folder
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId]
  };

  const response = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id',
  });

  const folderId = response.data.id;

  if (!folderId) {
    return null;
  }

  // Set permission cho folder là public
  await drive.permissions.create({
    fileId: folderId,
    requestBody: {
      type: 'anyone',
      role: 'reader', // hoặc 'writer' nếu muốn cho phép edit
    },
  });

  return folderId;
}