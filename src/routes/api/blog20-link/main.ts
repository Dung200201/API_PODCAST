import { FastifyPluginAsync } from "fastify";
import { createBlog20LinkMany } from "../../../controllers/blog20_link/create"
import { getAllBlog20Link } from "../../../controllers/blog20_link/getall"
import { updateBlog20Link, bulkUpdateBlog20Links } from "../../../controllers/blog20_link/update"
import { createBlog20LinkFromAccounts } from "../../../controllers/blog20_link/create copy"

const Blog20LinkRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {

    // Tạo 1 lúc nhiều dòng trong bảng link
    fastify.post("/create-many", async (request, reply) => {
        await createBlog20LinkMany(fastify, request, reply);
    }
    );

    // Tạo các bản ghi của bảng link theo id Request
    fastify.post<{ 
        Params: { blogRequestId: string } 
    }>("/create-links/:blogRequestId", async (request, reply) => {
            await createBlog20LinkFromAccounts(fastify, request, reply);
        }
    );

    // Get all link (có các điều kiện)
    fastify.get("/get-all", async (req, reply) => {
        await getAllBlog20Link(fastify, req, reply);
    });

    fastify.put<{
        Params: { id: string };
        Body: any;
    }>("/update/:id", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await updateBlog20Link(fastify, req, reply);
    });

    fastify.put<{
        Params: { id: string };
        Body: any;
    }>("/update-many", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await bulkUpdateBlog20Links(fastify, req, reply);
    });

};

export default Blog20LinkRoutes;