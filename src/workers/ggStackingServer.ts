// import { FastifyInstance } from "fastify";
// import { serverCheckGoogleStackingRequest } from "../controllers/google_stacking_request/auto";

// // Auto Làm việc xử lý bảng google_stacking_request
// export default async function (fastify: FastifyInstance) {
//     try {
//         fastify.log.info("🛠️ Google Stacking Request: Check Status is new...");
//         fastify.ready().then(() => {
//             setInterval(() => {
//                 serverCheckGoogleStackingRequest(fastify)
//             }, 2 * 60 * 1000); // chạy mỗi 5 ph
//         });

//     } catch (error) {
//         fastify.log.error(error);
//     }
// }   