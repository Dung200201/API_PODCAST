import { updatePackagesSchemas } from "../../schema/packages";
import { IPackages } from "../../types/packages";
import { handleErrorResponse } from "../../utils/handleError";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

interface Params {
    id: string;
}

export const updatePackage = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) => {
  try {
    const formData = request.body as IPackages;
    const idPk = request.params.id

    // Tìm package trong cơ sở dữ liệu theo id
    const packageDetail = await fastify.prisma.packages.findUnique({
      where: { id: idPk },
    });
    // Nếu không tìm thấy, trả về thông báo lỗi
    if (!packageDetail) {
      return reply.status(404).send({
        message: "Package not found with the provided ID.",
        success: false,
      });
    }

    // Kiểm tra nếu dữ liệu mới giống dữ liệu cũ
    const isDataSame =
    packageDetail.userId === formData.userId &&
    packageDetail.name === formData.name &&
    packageDetail.description === formData.description &&
    packageDetail.type === formData.type &&
    packageDetail.points === formData.points;

    if (isDataSame) {
    return reply.status(200).send({
      message: "No changes detected. Data remains the same.",
      success: true,
      packages: packageDetail, // Trả về dữ liệu cũ
    });
    }

    // Validate request body
    const checkValidate:any = updatePackagesSchemas.safeParse(formData);
    
    if (!checkValidate.success) {
      const allErrors = checkValidate.error.errors.map((err:any) => err.message).join(', ');
      return reply.status(400).send({
        message: allErrors,
      });
    }

    // Cập nhật dữ liệu gói
    const updatedPackage = await fastify.prisma.packages.update({
      where: { id: idPk }, // Xác định gói cần cập nhật dựa trên ID
      data: {
        user: {
          connect: { id: formData.userId },
        },
        name: formData.name,
        description: formData.description,
        type: formData.type,
        points: formData.points,
      },
    });
    return reply
      .status(200)
      .send({
        message: "Update data successfully!",
        success: true,
        packages: updatedPackage,
      });
  } catch (error) {
    console.log(error);
    handleErrorResponse(reply, error);
  }
};
