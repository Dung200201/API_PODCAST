import { FastifyPluginAsync } from "fastify";
import { createIndexRequest } from "../../../controllers/index_request/add";
import { getAllIndex } from "../../../controllers/index_request/getall";
import { deleteIndexRequestById, softDeleteIndex } from "../../../controllers/index_request/delete";
import { restoreIndexRequest } from "../../../controllers/index_request/restore";
import { getIndexRequestById } from "../../../controllers/index_request/get";
import { updateStatusIndexRequest } from "../../../controllers/index_request/patch";

import {  IndexRequestStatus } from "@prisma/client"; 
import { IIndexRequestCreate } from "../../../types";

interface IndexRequestParams {
    id: string;
}

// Định nghĩa kiểu dữ liệu cho request body
interface DeleteIndexesBody {
    ids: string[];
}

const IndexRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    
    // Tạo mới
    fastify.post<{Body: IIndexRequestCreate;}>("/create",{ preHandler: [fastify.authenticate] },async (req, reply) => {
        await createIndexRequest(fastify, req, reply);
      });

    // Lấy tất cả 
    fastify.get("/get-all", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await getAllIndex(fastify, req, reply);
    });
    
    // Lấy thông tin chi tiêts 
    fastify.get<{ Params: IndexRequestParams }>("/get-by-id/:id", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await getIndexRequestById(fastify, req, reply);
    });

    // xoá vĩnh viễn
    fastify.delete<{Body: DeleteIndexesBody;}>("/delete-by-ids",{ preHandler: [fastify.authenticate] },  async (req, reply) => {
        await deleteIndexRequestById(fastify, req, reply);
    });

    // xoá mềm
    fastify.patch<{Body: DeleteIndexesBody;}>("/soft-delete",{ preHandler: [fastify.authenticate] },  async (req, reply) => {
        await softDeleteIndex(fastify, req, reply);
    });

    // Khôi phục dữ liệu từ thùng rác
    fastify.patch<{ Body: DeleteIndexesBody }>("/restore-trash", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await restoreIndexRequest(fastify, req, reply);
    });

    // Cập nhật status
    fastify.patch<{ Params: IndexRequestParams, Body: {status: IndexRequestStatus}}>("/patch-status/:id", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await updateStatusIndexRequest(fastify, req, reply);
    });

};

export default IndexRoutes;
