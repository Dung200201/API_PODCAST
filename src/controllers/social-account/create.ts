import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { ISocialAccount } from "../../types/social_account";
import { v7 as uuidv7 } from "uuid";
import { createAccountSchema } from "../../schema/social_account";

export const createSocialAccount = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const isBulk = Array.isArray(request.body);

    // KHách hàng gửi lên là 1 mảng(import từ excel gửi lên)
    if (isBulk) {
      const formData = request.body as ISocialAccount[];

      // 1. Kiểm tra định dạng schema từng dòng
      const validationErrors: any = validateAccounts(formData);
      if (validationErrors) {
        return reply.status(400).send({ 
          message: "Upload Failed!",
          error: `${validationErrors}` 
        });
      }

      // 2. Kiểm tra xem group Id (Điều kiện k bị xoá mềm, trạng thái phải là new, completed)
      const socialGroupExists: any = await fastify.prisma.socialGroup.findFirst({
        where: { id: formData[0].socialGroupId, deletedAt: null, status: { in: ["new", "completed"] } },
        select: {
          id: true,
        }
      });
      if (!socialGroupExists) {
        return reply.status(400).send({
          message: "The specified group does not exist or has been deleted. Please check the information and try again",
        });
      }

      // 2. Lọc trùng domain (chỉ giữ lại 1 dòng với mỗi domain)
      const deduplicatedByDomain = removeDuplicateDomains(formData);

      // 3. Lọc theo website được hỗ trợ (từ bảng site)
      const { supportedItems, unsupportedWebsites } = await filterSupportedWebsites(fastify, deduplicatedByDomain);
      if (supportedItems.length === 0) {
        return reply.status(400).send({
          message: `The following domains are not supported: ${[...new Set(unsupportedWebsites)].join(", ")}. Please try again with different domains.`,
        });
      }

      // 4. Lọc trùng với DB (email + groupId)
      const duplicatesInDB = await fastify.prisma.socialAccount.findMany({
        where: {
          OR: supportedItems.map((item) => ({
            website: item.website,
            deletedAt: null,
            socialGroupId: item.socialGroupId,
          })),
        },
        select: { website: true },
      });

      const duplicateWebsitesSet = new Set(duplicatesInDB.map(item => item.website));

      // Phân loại supportedItems thành: không trùng và bị trùng
      const [validToInsert, duplicatedItems] = supportedItems.reduce<[typeof supportedItems, typeof supportedItems]>(
        (acc, item) => {
          if (duplicateWebsitesSet.has(item.website)) {
            acc[1].push(item); // trùng
          } else {
            acc[0].push(item); // hợp lệ
          }
          return acc;
        },
        [[], []]
      );

      // Nếu không còn gì để insert
      if (validToInsert.length === 0) {
        return reply.status(400).send({
          message: "All submitted domains already exist in the system.",
          skip: [...duplicateWebsitesSet],
        });
      }

      console.log(validToInsert);
      

      // 6. Chuẩn bị dữ liệu để tạo mới
      const createData = validToInsert.map((item) => ({
        id: uuidv7(),
        socialGroupId: item.socialGroupId,
        website: item.website,
        username: item.username,
        email: item.email?.trim(),
        password: item.password,
        twoFA: item.twoFA?.trim() ? item.twoFA?.trim() : null,
      }));

      const result = await fastify.prisma.socialAccount.createMany({
        data: createData,
        skipDuplicates: true,
      });

      return reply.status(200).send({
        message: "Created data successfully!",
        success: true,
        count: supportedItems.length,
        created: result.count,
        duplicate: duplicatedItems.map(item => item.website),
        skip: unsupportedWebsites
      });
    } else {
      // KHách hàng gửi lên là 1 object
      // form data
      const formData = request.body as ISocialAccount;

      // 1. validate
      const validation: any = createAccountSchema.safeParse(formData);
      if (!validation.success) {
        const allErrors = validation.error.errors.map((err: any) => err.message).join(", ");
        return reply.status(400).send({
          message: allErrors,
        });
      }

      // 2. Kiểm tra xem group Id (Điều kiện k bị xoá mềm, trạng thái phải là new, completed)
      const socialGroupExists: any = await fastify.prisma.socialGroup.findFirst({
        where: { id: validation.data.socialGroupId, deletedAt: null, status: { in: ["new", "completed"] } },
        select: {
          id: true,
        }
      });
      if (!socialGroupExists) {
        return reply.status(400).send({
          message: "The specified group does not exist or has been deleted. Please check the information and try again",
        });
      }

      // 3. check xem có nằm trong list site đang chạy không
      const { supportedItems, unsupportedWebsites } = await filterSupportedWebsites(fastify, [validation.data]);
      if (supportedItems.length === 0) {
        return reply.status(400).send({
          message: `The following domains are not supported: ${[...new Set(unsupportedWebsites)].join(", ")}. Please try again with different domains.`,
        });
      }

      // 4. check xem có tồn tại trong groupId và có trùng domain k
      const duplicatesInDB = await fastify.prisma.socialAccount.findFirst({
        where: {
          socialGroupId: validation.data.socialGroupId,
          website: validation.data.website,
          deletedAt: null
        },
        select: { website: true },
      });

      if (duplicatesInDB) {
        return reply.status(400).send({
          message: "This domain has already been created. Please try again with a different domain!",
          success: true,
          count: 1,
          created: 0,
          skip: [duplicatesInDB.website]
        });
      }

      // Form data ghi vào db
      const createData = supportedItems.map((item) => ({
        id: uuidv7(),
        socialGroupId: item.socialGroupId,
        website: item.website,
        username: item.username,
        email: item.email?.trim(),
        password: item.password,
        twoFA: item.twoFA,
      }));

      // 5. Tạo dữ liệu
      const result = await fastify.prisma.socialAccount.createMany({
        data: createData,
        skipDuplicates: true,
      });

      // 6 trả về kết quả
      return reply.status(200).send({
        message: "Created data successfully!",
        success: true,
        count: result.count,
        created: createData.length,
      });
    }
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};

function validateAccounts(data: ISocialAccount[]) {
  const results = data.map((item) => createAccountSchema.safeParse(item));
  const hasErrors = results.some((r) => !r.success);

  if (!hasErrors) return null;

  return results
    .map((result, index) => {
      if (!result.success) {
        const messages = result.error.errors.map((e) => e.message).join(", ");
        return `Row ${index + 1}: ${messages}`;
      }
      return null;
    })
    .filter(Boolean)
    .join(" | ");
}

function removeDuplicateDomains(data: ISocialAccount[]): ISocialAccount[] {
  const seenDomains = new Set<string>();
  const uniqueByDomain: ISocialAccount[] = [];

  for (const item of data) {
    if (!seenDomains.has(item.website)) {
      seenDomains.add(item.website);
      uniqueByDomain.push(item);
    }
  }

  return uniqueByDomain;
}

async function filterSupportedWebsites(fastify: FastifyInstance, data: ISocialAccount[]) {
  const allowedSites = await fastify.prisma.site.findMany({
    where: { status: "running", type: {in: ["social_accountSocial", "social" ]}, deletedAt: null },
    select: { domain: true },
  });

  const validDomainSet = new Set(allowedSites.map((site) => site.domain));

  const supportedItems = data.filter((item) => validDomainSet.has(item.website));
  const unsupportedWebsites = data
    .filter((item) => !validDomainSet.has(item.website))
    .map((item) => item.website);

  return { supportedItems, unsupportedWebsites };
}
