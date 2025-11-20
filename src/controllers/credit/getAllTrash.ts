import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getPaginationData } from "../../utils/pagination";

export const getAllCreditTrash = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
   try {
    const startTime = Date.now(); // Lưu thời gian request bắt đầu
     const {
       _s = "",
       _page = 1,
       _limit = 10,
       _code = "",
       _order = "desc",
     } = request.query as any;
 
    // Tạo điều kiện tìm kiếm trực tiếp
    const where: any = { deletedAt: { not: null} };

    if (_code) where.code = { contains: _code };
    if (_s) {
      where.OR = [
        { name: { contains: _s } },
        { description: { contains: _s } }
      ];
    }

     // Truy vấn dữ liệu
     const [data, totalItems] = await Promise.all([
       fastify.prisma.credit.findMany({
         where,
         skip: (_limit === "-1" ? 0 : (Number(_page || 1) - 1) * Number(_limit || 10)),
         take: (_limit === "-1" ? undefined : Number(_limit || 10)),
          orderBy: { updatedAt: _order || "desc" }
       }),
       fastify.prisma.credit.count({ where }),
     ]);
 
     // Nếu không có dữ liệu tìm thấy
     if (!data || data.length === 0) {
       return reply
         .status(404)
         .send({ message: "No data found!", success: false });
     }
 
    // Tính toán dữ liệu phân trang
       const pagination = getPaginationData(Number(_page), Number(_limit), totalItems, request.url, startTime);
   
     return reply.status(200).send({
       message: "Retrieve data successfully!",
       success: true,
       pagination,
       credits: data,
     });
   } catch (error) {
     handleErrorResponse(reply, error);
   }
};
