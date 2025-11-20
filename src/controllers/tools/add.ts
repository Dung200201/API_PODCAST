import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { v7 as uuidv7 } from 'uuid';

// Tạo data tool trên db
export const createTool = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const formData = request.body as any;
    const {service, id_tool} = formData;

    // Validate request body
    // const checkValidate:any = createToolSchema.safeParse(formData);
    
    // if (!checkValidate.success) {
    //   const allErrors = checkValidate.error.errors.map((err:any) => err.message).join(', ');
    //   return reply.status(400).send({
    //     message: allErrors,
    //   });
    // }

    const checkTool = await fastify.prisma.tools.findFirst({
      where: { service: service, id_tool:id_tool },
    });

    if (checkTool) {
      return reply.status(400).send({
        message: "Tên id tool bị trùng rồi đổi tên khác nhé.",
        success: false,
      });
    }
    const now = new Date()
    const dataReq = {
        id: uuidv7(),
        userId: "01960bf4-3977-7339-882c-3337cfe0e43e",
        time:  now.toISOString(),
        thread_number: 20,
        status: "die",
        ...formData
    }

    // Tạo dữ liệu mới trong cơ sở dữ liệu
    const newData = await fastify.prisma.$transaction(async (prisma: any) => {
      const data = await prisma.tools.create({
        data: dataReq,
      });
      return data;
    });

    // Trả về kết quả
    return reply
      .status(200)
      .send({ message: "Created tool successfully!", success: true, newData });
  } catch (error) {
    console.log("error", error);
    
    handleErrorResponse(reply, error); // Hàm xử lý lỗi
  }
};
