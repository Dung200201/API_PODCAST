import { FastifyPluginAsync } from "fastify";
import { createBlog20RequestController } from "../../../controllers/blog20_request/add";
import { getBlog20RequestById } from "../../../controllers/blog20_request/get";
import { getBlog20RequestDetailsById } from "../../../controllers/blog20_request/get";
import { getAllBlog20Request } from "../../../controllers/blog20_request/getall";
import { updateBlog20Request } from "../../../controllers/blog20_request/update";
import { updateBlog20Status } from "../../../controllers/blog20_request/patch";
import { deleteBlog20RequestById, softDeleteBlog20Request } from "../../../controllers/blog20_request/delete";
import { downloadReportBlog20Request } from "../../../controllers/blog20_request/downloadReport";
import { downloadLinksFromRegisterRequest } from "../../../controllers/blog20_request/downloadReportAllLink"


interface UpdateBlog20Body {
    name?: string;
    typeRequest?: "register" | "post";
    data?: Record<string, any> | string;
    blogGroupId?: string;
    id_tool?: string;       // Chỉ admin
    status?: string;        // Chỉ admin
}

// Định nghĩa kiểu dữ liệu cho request body
interface DeleteIndexesBody {
    ids: string[];
}

const Blog20RequestRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    // Tao 
    fastify.post("/add", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await createBlog20RequestController(fastify, req, reply);
    });

    // Get by Id
    fastify.get("/get-by-id/:id", { preHandler: [fastify.authenticate] }, async function (request, reply) {
        await getBlog20RequestById(fastify, request as any, reply);
    });

    // Get details by Id
    fastify.get("/get-details/:id", { preHandler: [fastify.authenticate] }, async function (request, reply) {
        await getBlog20RequestDetailsById(fastify, request as any, reply);
    });

    // Get All Request
    fastify.get("/get-all", { preHandler: [fastify.authenticate] }, async function (request, reply) {
        await getAllBlog20Request(fastify, request as any, reply);
    });

    // Update Request
    fastify.put<{
        Params: { id: string };
        Body: UpdateBlog20Body;
    }>(
        "/update/:id",
        { preHandler: [fastify.authenticate] },
        async (req, reply) => {
            await updateBlog20Request(fastify, req, reply);
        }
    );

    // Update Request qua trạng thái New check qua các điều kiện điểm và quyền user
    fastify.patch<{ Body: any; }>("/update-status/:id", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await updateBlog20Status(fastify, req, reply);
    });

    fastify.delete<{ Body: DeleteIndexesBody; }>("/delete-by-ids", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await deleteBlog20RequestById(fastify, req, reply);
    });

    fastify.patch<{ Body: { ids: string[] } }>("/soft-delete", { preHandler: [fastify.authenticate] }, async (req, reply) => {
            await softDeleteBlog20Request(fastify, req, reply);
        }
    );

    // Download report route
    // fastify.get("/download-report/:id", { preHandler: [fastify.authenticate] }, async (req, reply) => {
    //     await downloadReportBlog20Request(fastify, req as any, reply);
    // });

    fastify.get("/download-report/:id", async (req, reply) => {
        await downloadReportBlog20Request(fastify, req as any, reply);
    });

    fastify.get("/download-linkall/:id", async (req, reply) => {
        await downloadLinksFromRegisterRequest(fastify, req as any, reply);
    });
};

export default Blog20RequestRoutes;