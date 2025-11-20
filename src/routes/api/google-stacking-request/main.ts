import { FastifyPluginAsync } from "fastify";
import { createGoogleStackingRequest } from "../../../controllers/google_stacking_request/add";
import { getAllGgStackingRequest } from "../../../controllers/google_stacking_request/getall";
import { getGgStackingRequestById } from "../../../controllers/google_stacking_request/get";
import { IDeleteBodyIds, IParams } from "../../../types/generate";
import { deleteGgStackingRequestById, softDeletGgStacking } from "../../../controllers/google_stacking_request/delete";
import { updateGoogleStackingRequest } from "../../../controllers/google_stacking_request/update";
import { updateGoogleStackingStatus } from "../../../controllers/google_stacking_request/patch";
import { DownLoadReportGgStacking } from "../../../controllers/google_stacking_request/dowloadReport";
import { duplicateGgStacking } from "../../../controllers/google_stacking_request/duplicate";
import { DownLoadReportGgStackingLink } from "../../../controllers/google_stacking_link/downloadReport";
import { mergeFile } from "../../../controllers/google_stacking_request/mergeFile";

const GoogleStackingRequestRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    // Thêm mới data vào db
    fastify.post("/create", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await createGoogleStackingRequest(fastify, req, reply);
    });

    // Trả về danh sách người dùng yêu cầu
    fastify.get("/get-all", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await getAllGgStackingRequest(fastify, req, reply);
    });

    // Trả về danh sách người dùng yêu cầu
    fastify.get<{ Params: IParams }>("/get-by-id/:id", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await getGgStackingRequestById(fastify, req, reply);
    });

    // Xoá mềm
    fastify.patch<{Body: IDeleteBodyIds;}>("/soft-delete", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await softDeletGgStacking(fastify, req, reply);
    });

    // Xoá vĩnh viễn
    fastify.delete<{Body: IDeleteBodyIds;}>("/delete-by-ids", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await deleteGgStackingRequestById(fastify, req, reply);
    });

    // udapte status
    fastify.put<{Body: IDeleteBodyIds;}>("/update-status/:id", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await updateGoogleStackingStatus(fastify, req, reply);
    });

    // Update request
    fastify.put<{
        Params: { id: string };  
        Body: any;
    }>("/update/:id", { preHandler: [fastify.authenticate] },  async (req, reply) => {
        await updateGoogleStackingRequest(fastify, req, reply);
    });

    // Download report route
    fastify.get<{ Params: IParams }>("/download-report/:id",{ preHandler: [fastify.authenticate] },   async (req, reply) => {
        await DownLoadReportGgStacking(fastify, req, reply);
    });
    // Download report route
    fastify.get<{ Params: IParams }>("/duplicate/:id",{ preHandler: [fastify.authenticate] },  async (req, reply) => {
        await duplicateGgStacking(fastify, req, reply);
    });
    fastify.get<{ Params: IParams }>("/download-report-website",  async (req, reply) => {
        await DownLoadReportGgStackingLink(fastify, req, reply);
    });
    fastify.post("/merge-file",{ preHandler: [fastify.authenticate] },  async (req, reply) => {
        await mergeFile(fastify, req, reply);
    });
};

export default GoogleStackingRequestRoutes;