// import { FastifyInstance } from "fastify";
// import { serverCheckSocialGroup } from "../controllers/social-group/auto";

// // Auto Làm việc xử lý bảng google_stacking_request
// export default async function (fastify: FastifyInstance) {
//     try {
//         fastify.log.info("🛠️ Social Group Server: running");
//         fastify.ready().then(() => {
//             setInterval(() => {
//                 serverCheckSocialGroup(fastify)
//             }, 2 * 60 * 1000); // chạy mỗi 5 giay
//         });

//     } catch (error) {
//         fastify.log.error(error);
//     }
// }   