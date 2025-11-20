import { FastifyPluginAsync } from "fastify";
import { getAllIndexLink } from "../../../controllers/index_link/getall";
import { getIndexLinkById } from "../../../controllers/index_link/get";
import { downloadIndexLink, downloadIndexLinksAll } from "../../../controllers/index_link/download";
import { statisticalIndexLink } from "../../../controllers/statistical/indexLink";

// // Định nghĩa kiểu dữ liệu cho request body
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
    fastify.get("/get-all", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await getAllIndexLink(fastify, req, reply);
    });

    // Cập nhật status
    // fastify.put<{
    //     Params: { id: string };  
    //     Body: UpdateIndexLinkBody;
    // }>("/update/:id", { preHandler: [fastify.authenticate] },  async (req, reply) => {
    //     await updateIndexLink(fastify, req, reply);
    // });

    // Lấy chi tiết thông tin
    fastify.get<{
        Params: { id: string };  
        Body: UpdateIndexLinkBody;
    }>("/get-by-id/:id", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await getIndexLinkById(fastify, req, reply);
    });

    // download link
    fastify.get<{
        Params: { indexRequestId: string };  
        Body: UpdateIndexLinkBody;
    }>("/download-link/:indexRequestId", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await downloadIndexLink(fastify, req, reply);
    });
    
    fastify.get<{
        Params: { indexRequestId: string };  
        Body: UpdateIndexLinkBody;
    }>("/download-link/all", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await downloadIndexLinksAll(fastify, req, reply);
    });

    // thống kê link
    fastify.get("/statistics", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await statisticalIndexLink(fastify, req, reply);
    });
};

export default IndexLinkRoutes;