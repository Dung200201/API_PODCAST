import { FastifyPluginAsync } from "fastify";
import { getAllIndexLink } from "../../../../controllers/index_link/getall";
import { getIndexLinkById } from "../../../../controllers/index_link/get";
import { batchUpdateIndexLinks } from "../../../../controllers/index_link/update";

// Định nghĩa kiểu dữ liệu cho request body
 interface UpdateIndexLinkBody {
    url?: string;
    response?: number;
    push?: number;
    information?: string;
    indexed?: boolean;
    deletedAt?: Date;
    status?: "new" | "pending" | "indexing" | "done" | "failed"; // Đảm bảo đồng nhất
    indexRequestId: string;
}

const IndexLinkRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    // Lấy tất cả 
    fastify.get("/get-all", { preHandler: [fastify.apiKeyAuth, fastify.authorize(["dev"])] },  async (req, reply) => {
        await getAllIndexLink(fastify, req, reply);
    });

    // Cập nhật status
    fastify.put<{
        Params: { id: string };  
        Body: UpdateIndexLinkBody;
    }>("/batch-update", { preHandler: [fastify.apiKeyAuth, fastify.authorize(["dev"])] },  async (req, reply) => {
        await batchUpdateIndexLinks(fastify, req as any, reply);
    });

    // Lấy chi tiết thông tin
    fastify.get<{
        Params: { id: string };  
        Body: UpdateIndexLinkBody;
    }>("/get-by-id/:id", { preHandler: [fastify.apiKeyAuth, fastify.authorize(["dev"])] },  async (req, reply) => {
        await getIndexLinkById(fastify, req, reply);
    });
    
};

export default IndexLinkRoutes;