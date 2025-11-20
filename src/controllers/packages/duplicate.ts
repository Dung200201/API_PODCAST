import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import slugify from "slugify";
import { v7 as uuidv7 } from 'uuid';

interface Params {
  id: string; // ID của package cần duplicate
}

export const duplicatePackage = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) => {
  try {
    const packageId = request.params.id

    // Lấy thông tin package cần nhân bản
    const packageDetail:any = await fastify.prisma.packages.findUnique({
      where: { id: packageId },
    });

    if (!packageDetail) {
      return reply.status(404).send({
        message: "Package not found.",
        success: false,
      });
    }

    // Tạo slug mới tránh trùng lặp
    let baseSlug = slugify(packageDetail.name, { lower: true, strict: true, trim: true });
    let uniqueSlug = `${baseSlug}-copy`;
    let count = 1;

    while (true) {
      const existingPackage:any = await fastify.prisma.packages.findFirst({
        where: { slug: uniqueSlug },
      });

      if (!existingPackage) break;

      uniqueSlug = `${baseSlug}-copy-${count}`;
      count++;
    }

    // Nhân bản dữ liệu
    const duplicatedPackage = await fastify.prisma.packages.create({
      data: {
        id: uuidv7(),
        user: {
          connect: { id: packageDetail.userId  }, // Giữ nguyên userId
        },
        type: packageDetail.type,
        name: `${packageDetail.name} (Copy)`, // Tên mới
        description: packageDetail.description,
        points: packageDetail.points,
        price_vnd: packageDetail.price_vnd,
        price_usd: packageDetail.price_usd,
        slug: uniqueSlug,
      },
    });

    return reply.status(200).send({
      message: "Package duplicated successfully!",
      success: true,
      newPackage: duplicatedPackage,
    });
  } catch (error) {
    console.log(error);
    handleErrorResponse(reply, error);
  }
};
