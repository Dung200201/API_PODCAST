import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { IPackages } from "../../types/packages";
import slugify from "slugify";
import { v7 as uuidv7 } from 'uuid';

export const createSocialLink = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const formData = request.body as IPackages;
    const normalizedName = formData.name.trim();

    // Validate request body
    // const checkValidate:any = createPackagesSchemas.safeParse(formData);
    
    // if (!checkValidate.success) {
    //   const allErrors = checkValidate.error.errors.map((err:any) => err.message).join(', ');
    //   return reply.status(400).send({
    //     message: allErrors,
    //   });
    // }
    // Kiểm tra xem slug đã tồn tại chưa
    let baseSlug = slugify(normalizedName, { lower: true, strict: true, trim: true });
    let uniqueSlug = baseSlug;
    let count = 1;

    // Kiểm tra xem slug đã tồn tại chưa, nếu có thì thêm số vào cuối
    while (true) {
      const existingPackage = await fastify.prisma.packages.findFirst({
        where: { slug: uniqueSlug },
      });

      if (!existingPackage) break; // Nếu slug chưa tồn tại, thoát vòng lặp

      uniqueSlug = `${baseSlug}-${count}`;
      count++;
    }

    // Tạo dữ liệu mới trong cơ sở dữ liệu
    const newData = await fastify.prisma.$transaction(async (prisma: any) => {
      const data = await prisma.packages.create({
        data: {
          id: uuidv7(),
          user: {
            connect: { id: formData.userId },
          },
          type: formData.type,
          name: normalizedName,
          description: formData.description,
          points: formData.points,
          price_vnd: formData.price_vnd, // Đảm bảo giá trị là Decimal
          price_usd: formData.price_usd, // Đảm bảo giá trị là Decimal
          slug: uniqueSlug
        },
      });
      return data;
    });

    // Trả về kết quả
    return reply
      .status(200)
      .send({ message: "Created data successfully!", success: true, newData });
  } catch (error) {
    console.log(error);
    handleErrorResponse(reply, error); // Hàm xử lý lỗi
  }
};
