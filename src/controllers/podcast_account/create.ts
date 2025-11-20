import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";

const WEBSITES_SOURCE_URL = "https://cdn.haveproxy.com/data/likepion/podcast.txt";

export const createPodcastAccountSchema = z.object({
  podcastGroupId: z.string().min(1, "podcastGroupId is required"),
  id_tool: z.string().optional(),
  website: z.string().min(1, "website is required"),
  username: z.string().optional(),
  email: z.string().optional(),
  pass_mail: z.string().optional(),
  password: z.string().optional(),
  app_password: z.string().optional(), 
  twoFA: z.string().optional(),
  cookies: z.string().optional(),
  note: z.string().optional(),
});

type IBPodcastAccount = z.infer<typeof createPodcastAccountSchema>;

export const createPodcastAccount = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const rawBody = request.body as any;

    // NHẬN DẠNG bulk: 3 cách
    // 1) client gửi mảng (old behaviour)
    // 2) client gửi object với website = WEBSITES_SOURCE_URL (tức muốn lấy danh sách từ file)
    // 3) client gửi object và đặt bulk: true (explicit)
    const isArrayBody = Array.isArray(rawBody);
    const isExplicitBulk = !!(rawBody && rawBody.bulk === true);
    const isSourceUrlBulk =
      rawBody && typeof rawBody.website === "string" && rawBody.website === WEBSITES_SOURCE_URL;

    const isBulk = isArrayBody || isExplicitBulk || isSourceUrlBulk;

    if (isBulk) {
      // chuẩn hóa formData thành array (nếu client gửi object đơn)
      const formData: IBPodcastAccount[] = isArrayBody ? (rawBody as IBPodcastAccount[]) : [rawBody as IBPodcastAccount];

      // Validate phần thông tin chung 
      const validationErrors = validateAccounts(formData);
      if (validationErrors) {
        return reply.status(400).send({
          message: "Validation failed!",
          error: validationErrors,
        });
      }

      // Kiểm tra podcastGroupId tồn tại
      const podcastGroupId = formData[0].podcastGroupId;
      const podcastGroup = await fastify.prisma.podcastGroup.findFirst({
        where: { id: podcastGroupId, deletedAt: null },
        select: { id: true },
      });
      if (!podcastGroup) {
        return reply.status(400).send({
          message: "The specified podcast group does not exist or has been deleted.",
        });
      }

      // Nếu client gửi object đơn với website = WEBSITES_SOURCE_URL -> fetch danh sách website từ URL
      let websiteList: string[] = [];
      if (isSourceUrlBulk) {
        const response = await fetch(WEBSITES_SOURCE_URL);
        if (!response.ok) {
          return reply.status(500).send({
            message: "Cannot fetch website list from source URL.",
          });
        }
        const text = await response.text();
        websiteList = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (websiteList.length === 0) {
          return reply.status(400).send({
            message: "No websites found in the source list.",
          });
        }
      } else {
        // Nếu client gửi array đầy đủ (một entry cho mỗi website), lấy websiteList từ array
        websiteList = formData.map((f) => f.website).filter(Boolean);
      }

      // kiểm tra trùng website trong DB
      const duplicatesInDB = await fastify.prisma.podcastAccount.findMany({
        where: {
          podcastGroupId,
          website: { in: websiteList },
          deletedAt: null,
        },
        select: { website: true },
      });

      const existingSet = new Set(duplicatesInDB.map((d) => d.website));
      const validToInsert = websiteList.filter((w) => !existingSet.has(w));
      const duplicated = websiteList.filter((w) => existingSet.has(w));

      if (validToInsert.length === 0) {
        return reply.status(400).send({
          message: "All websites already exist in the system.",
          skip: Array.from(existingSet),
        });
      }

      const baseInfo = formData[0];
      const createData = validToInsert.map((domain, index) => {
        const accountInfo = formData[index] ?? baseInfo; // nếu người dùng truyền list đầy đủ, lấy theo index, nếu không thì dùng baseInfo
        return {
          id: uuidv7(),
          podcastGroupId,
          id_tool: null,
          website: domain,
          username: accountInfo.username ?? null,
          email: accountInfo.email ?? null,
          pass_mail: accountInfo.pass_mail ?? null,
          password: accountInfo.password ?? null,
          app_password: accountInfo.app_password ?? null,
          twoFA: accountInfo.twoFA ?? null,
          cookies: accountInfo.cookies ?? null,
          note: accountInfo.note ?? null,
        };
      });

      const result = await fastify.prisma.podcastAccount.createMany({
        data: createData,
        skipDuplicates: true,
      });

      return reply.status(200).send({
        message: "Created blog accounts successfully!",
        success: true,
        totalWebsites: websiteList.length,
        created: result.count,
        duplicated,
      });
    }

    // ---------- NON-BULK (dòng thông thường) ----------
    const formData = rawBody as IBPodcastAccount;
    const validation = createPodcastAccountSchema.safeParse(formData);
    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(", ");
      return reply.status(400).send({ message: errors });
    }

    const podcastGroup = await fastify.prisma.podcastGroup.findFirst({
      where: { id: validation.data.podcastGroupId, deletedAt: null },
      select: { id: true },
    });
    if (!podcastGroup) {
      return reply.status(400).send({
        message: "The specified podcast group does not exist or has been deleted.",
      });
    }

    const existed = await fastify.prisma.podcastAccount.findFirst({
      where: {
        podcastGroupId: validation.data.podcastGroupId,
        website: validation.data.website,
        deletedAt: null,
      },
    });
    if (existed) {
      return reply.status(400).send({
        message: "This website already exists in this group.",
        skip: [validation.data.website],
      });
    }

    const created = await fastify.prisma.podcastAccount.create({
      data: {
        id: uuidv7(),
        ...validation.data,
      },
    });

    return reply.status(200).send({
      message: "Created successfully!",
      success: true,
      created,
    });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};

//HÀM PHỤ
function validateAccounts(data: IBPodcastAccount[]) {
  const results = data.map((item) => createPodcastAccountSchema.safeParse(item));
  const hasErrors = results.some((r) => !r.success);
  if (!hasErrors) return null;
  return results
    .map((r, i) =>
      !r.success
        ? `Row ${i + 1}: ${r.error.errors.map((e) => e.message).join(", ")}`
        : null
    )
    .filter(Boolean)
    .join(" | ");
}
