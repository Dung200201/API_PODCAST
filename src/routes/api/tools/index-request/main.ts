import { FastifyPluginAsync } from "fastify";
import { createIndexRequest } from "../../../../controllers/index_request/add";
import {  getAllIndexRequestWhereStatus } from "../../../../controllers/index_request/getall";
import { getIndexRequestById } from "../../../../controllers/index_request/get";
import { IBodyIds, IParams } from "../../../../types/generate";
import { restoreIndexRequest } from "../../../../controllers/index_request/restore";
import { updateStatusIndexRequest } from "../../../../controllers/index_request/patch";
import { deleteIndexRequestById, softDeleteIndex } from "../../../../controllers/index_request/delete";
import { IIndexRequestCreate } from "../../../../types";

const IndexRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    
    // Tạo mới
    fastify.post<{Body: IIndexRequestCreate;}>("/create",{ preHandler: [fastify.apiKeyAuth] },async (req, reply) => {
        await createIndexRequest(fastify, req, reply);
    });

    // Lấy tất cả 
    fastify.get("/get-all/status", { preHandler: [fastify.apiKeyAuth, fastify.authorize(["dev"])] },  async (req, reply) => {
        await getAllIndexRequestWhereStatus(fastify, req, reply);
    });
    
    // Lấy thông tin chi tiết
    fastify.get<{ Params: IParams }>("/get-by-id/:id", { preHandler: [fastify.apiKeyAuth, fastify.authorize(["dev"])] }, async (req, reply) => {
        await getIndexRequestById(fastify, req, reply);
    });

    // xoá vĩnh viễn
    fastify.delete<{Body: IBodyIds;}>("/delete-by-ids",{ preHandler: [fastify.apiKeyAuth, fastify.authorize(["dev"])] },  async (req, reply) => {
        await deleteIndexRequestById(fastify, req, reply);
    });

    // xoá mềm
    fastify.patch<{Body: IBodyIds;}>("/soft-delete",{ preHandler: [fastify.apiKeyAuth, fastify.authorize(["dev"])] },  async (req, reply) => {
        await softDeleteIndex(fastify, req, reply);
    });

    // Khôi phục dữ liệu từ thùng rác
    fastify.patch<{ Body: IBodyIds }>("/restore-trash", { preHandler: [fastify.apiKeyAuth, fastify.authorize(["dev"])] },  async (req, reply) => {
        await restoreIndexRequest(fastify, req, reply);
    });

    // Cập nhật status
    fastify.patch<{ Params: IParams, Body: {status: any}}>("/patch-status/:id", { preHandler: [fastify.apiKeyAuth, fastify.authorize(["dev"])] },  async (req, reply) => {
        await updateStatusIndexRequest(fastify, req, reply);
    });

};

export default IndexRoutes;
