import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";

const WEBSITES_SOURCE_URL = "https://cdn.haveproxy.com/data/likepion/blo20.txt";

export const createBlog20AccountSchema = z.object({
  blogGroupId: z.string().min(1, "blogGroupId is required"),
  id_tool: z.string().optional(),
  website: z.string().min(1, "website is required"),
  username: z.string().optional(),
  email: z.string().optional(),
  pass_mail: z.string().optional(),
  password: z.string().optional(),
  app_password: z.string().optional(), 
  twoFA: z.string().optional(),
  quickLink: z.string().optional(),
  homeLink: z.string().optional(),
  cookies: z.string().optional(),
  note: z.string().optional(),
});

type IBlog20Account = z.infer<typeof createBlog20AccountSchema>;

export const createBlog20Account = async (
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
      const formData: IBlog20Account[] = isArrayBody ? (rawBody as IBlog20Account[]) : [rawBody as IBlog20Account];

      // Validate phần thông tin chung 
      const validationErrors = validateAccounts(formData);
      if (validationErrors) {
        return reply.status(400).send({
          message: "Validation failed!",
          error: validationErrors,
        });
      }

      // Kiểm tra blogGroupId tồn tại
      const blogGroupId = formData[0].blogGroupId;
      const blogGroup = await fastify.prisma.blog20Group.findFirst({
        where: { id: blogGroupId, deletedAt: null },
        select: { id: true },
      });
      if (!blogGroup) {
        return reply.status(400).send({
          message: "The specified blog group does not exist or has been deleted.",
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
      const duplicatesInDB = await fastify.prisma.blog20Account.findMany({
        where: {
          blogGroupId,
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
          blogGroupId,
          id_tool: null,
          website: domain,
          username: accountInfo.username ?? null,
          email: accountInfo.email ?? null,
          pass_mail: accountInfo.pass_mail ?? null,
          password: accountInfo.password ?? null,
          app_password: accountInfo.app_password ?? null,
          twoFA: accountInfo.twoFA ?? null,
          quickLink: accountInfo.quickLink ?? null,
          homeLink: accountInfo.homeLink ?? null,
          cookies: accountInfo.cookies ?? null,
          note: accountInfo.note ?? null,
        };
      });

      const result = await fastify.prisma.blog20Account.createMany({
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
    const formData = rawBody as IBlog20Account;
    const validation = createBlog20AccountSchema.safeParse(formData);
    if (!validation.success) {
      const errors = validation.error.errors.map((e) => e.message).join(", ");
      return reply.status(400).send({ message: errors });
    }

    const blogGroup = await fastify.prisma.blog20Group.findFirst({
      where: { id: validation.data.blogGroupId, deletedAt: null },
      select: { id: true },
    });
    if (!blogGroup) {
      return reply.status(400).send({
        message: "The specified blog group does not exist or has been deleted.",
      });
    }

    const existed = await fastify.prisma.blog20Account.findFirst({
      where: {
        blogGroupId: validation.data.blogGroupId,
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

    const created = await fastify.prisma.blog20Account.create({
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
function validateAccounts(data: IBlog20Account[]) {
  const results = data.map((item) => createBlog20AccountSchema.safeParse(item));
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
