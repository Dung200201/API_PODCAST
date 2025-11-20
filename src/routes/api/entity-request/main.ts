import { FastifyPluginAsync } from "fastify";
import { getAllEntityRequest } from "../../../controllers/entity_request/getall";
import { createRequestController } from "../../../controllers/entity_request/add";
import { updateEntityRequest } from "../../../controllers/entity_request/update";
import { duplicateEntityRequest } from "../../../controllers/entity_request/duplicate";
import { getEntityRequestById, getEntityRequestCountById } from "../../../controllers/entity_request/get";
import { deletEntityRequestById, softDeletEntity } from "../../../controllers/entity_request/delete";
import { updateEntityStatus } from "../../../controllers/entity_request/patch";
import { DownLoadReport } from "../../../controllers/entity_request/dowloadReport";
import { runMoreEntityRequest } from "../../../controllers/entity_request/runMore";
import { getContentByAI } from "../../../controllers/entity_request/ai";
import { continueGoogleStacking } from "../../../controllers/entity_request/runGoogleStacking";

export interface UpdateEntityBody {
    entity_email?: string;
    id_tool?: string;
    app_password?: string;
    entity_limit?: number;
    auction_price?: number;
    fixed_sites?: string[];
    about?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
}

interface IParams {
    id: string;
}

// Định nghĩa kiểu dữ liệu cho request body
interface DeleteIndexesBody {
    ids: string[];
}

const EntityRequestRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    // Lấy tất cả 
    fastify.get("/get-all", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await getAllEntityRequest(fastify, req, reply);
    });

    // Lấy chi tiết
    fastify.get<{ Params: IParams }>("/get-by-id/:id", { preHandler: [fastify.authenticate] },async (req, reply) => {
        await getEntityRequestById(fastify, req, reply);
    });

    // Lấy Tính count links
    fastify.get<{ Params: IParams }>("/get-links-by-id/:id", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await getEntityRequestCountById(fastify, req, reply);
    });

    // Tao 
    fastify.post("/create", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await createRequestController(fastify, req, reply);
    });

    // Update request
    fastify.put<{
        Params: { id: string };  
        Body: UpdateEntityBody;
    }>("/update/:id", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await updateEntityRequest(fastify, req, reply);
    });

    // Duplicate request
    fastify.get<{
        Params: { id: string };  
        Body: UpdateEntityBody;
    }>("/duplicate/:id", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await duplicateEntityRequest(fastify, req, reply);
    });

    // Run more request
    fastify.post("/run-more", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await runMoreEntityRequest(fastify, req, reply);
    });

    // xoá vĩnh viễn
    fastify.delete<{Body: DeleteIndexesBody;}>("/delete-by-ids", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await deletEntityRequestById(fastify, req, reply);
    });

    // xoá mềm
    fastify.patch<{Body: DeleteIndexesBody;}>("/soft-delete", { preHandler: [fastify.authenticate] },async (req, reply) => {
        await softDeletEntity(fastify, req, reply);
    });

    fastify.patch<{Body: any;}>("/update-status/:id", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await updateEntityStatus(fastify, req, reply);
    });

    // Download report route
    fastify.post("/download",{ preHandler: [fastify.authenticate] },   async (req, reply) => {
        await DownLoadReport(fastify, req as any, reply);
    });

    // AI
    fastify.post("/ai/get-content",{ preHandler: [fastify.authenticate] },   async (req, reply) => {
        await getContentByAI(fastify, req as any, reply);
    });

    fastify.post("/gg-stacking/continue",{ preHandler: [fastify.authenticate] },   async (req, reply) => {
        await continueGoogleStacking(fastify, req as any, reply);
    });
};

export default EntityRequestRoutes;