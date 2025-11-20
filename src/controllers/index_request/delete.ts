import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { getUserPreferences } from "../../service/getLanguageDb";
import { translations } from "../../lib/i18n";

// Định nghĩa kiểu dữ liệu cho request body
interface DeleteIndexesBody {
  ids: string[];
}

// Xoá xĩnh viễn
export const deleteIndexRequestById = async (
  fastify: FastifyInstance,
  request:  FastifyRequest<{ Body: DeleteIndexesBody }>,
  reply: FastifyReply
) => {
  try {
    const { ids } = request.body;
    const  {id:userId, role}  = request.user as { id: string; role: string };
    const {language:dataLanguage} = await getUserPreferences(fastify,request,userId);
    // Kiểm tra nếu danh sách ID rỗng hoặc không hợp lệ
    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({ 
        message: translations[dataLanguage].services.invalidIdRequest,
        success: false,
      });
    }
    const isAdmin = role === "admin"

    // Kiểm tra xem có bản ghi nào cần xóa không
    const existingIndexes = await fastify.prisma.indexRequest.findMany({
      where: {
        id: { in: ids },
        ...(isAdmin ? {} : { userId }), 
      },
      select: { id: true },
    });


    if (existingIndexes.length === 0) {
      return reply.status(404).send({
        message: translations[dataLanguage].services.noValidIndexes,
        success: false,
      });
    }

    // Chia nhỏ danh sách ID để tránh quá tải DB nếu có quá nhiều bản ghi
    const BATCH_SIZE = 100; // Tùy chỉnh batch size phù hợp với DB của bạn
    const idBatches = [];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      idBatches.push(ids.slice(i, i + BATCH_SIZE));
    }

    let totalDeleted = 0;

    // Xóa từng batch
    for (const batch of idBatches) {
      const deleted = await fastify.prisma.indexRequest.deleteMany({
        where: { id: { in: batch }, deletedAt: { not: null } }, // Chỉ xóa những bản ghi đã bị xóa mềm trước đó
      });
      totalDeleted += deleted.count;
    }

    if(totalDeleted === 0){
      return reply.status(404).send({
        message: translations[dataLanguage].services.indexNotFoundOrDeleted,
        success: false,
      });
    }

    return reply.status(200).send({
      message: `${translations[dataLanguage].services.deletedIndexesSuccessFirst} ${totalDeleted} ${translations[dataLanguage].services.deletedIndexesSuccessSecond}`,
      success: true,
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};

// xoá mềm
export const softDeleteIndex = async (
  fastify: FastifyInstance,
  request: FastifyRequest<{ Body: { ids: string[] } }>,
  reply: FastifyReply
) => {
  try {
    const { ids } = request.body;
    const  {id:userId,role}  = request.user as { id: string, role:string };
    const isAdmin = role === "admin" || role ==="dev" ;
  
    const {language:dataLanguage} = await getUserPreferences(fastify,request,userId);
    if (!Array.isArray(ids) || ids.length === 0) {
      return reply.status(400).send({ 
        message: translations[dataLanguage].services.invalidIdRequest,
        success: false,
      });
    }
    
    // Xóa nhiều bản ghi cùng lúc
    const data = await fastify.prisma.indexRequest.updateMany({
      where: {
        id: { in: ids },
        ...(isAdmin ? {deletedAt: null } : { userId, deletedAt: null }),
      },
      data: { deletedAt: new Date() },
    });

    // Kiểm tra nếu không có bản ghi nào được cập nhật
    if (data.count === 0) {
      return reply.status(404).send({
        message: translations[dataLanguage].services.noValidIndexes,
        success: false,
      });
    }

    return reply.status(200).send({
      success: true,
    });
  } catch (error: any) {
    
    handleErrorResponse(reply, error);
  }
};
