// import { FastifyInstance } from "fastify";
// import { cyan, red, yellow } from "../utils/log-color";
// import { serverCheckSocialRequest } from "../controllers/social_request/auto";

// // Auto Làm việc xử lý bảng google_stacking_request
// export default async function (fastify: FastifyInstance) {
//     try {
//         fastify.log.info(cyan("🛠️ Social Request Server: running"));
//         fastify.ready().then(() => {
//             setInterval(() => {
//                 fastify.log.info(yellow("🔁 Checking social request status..."));
//                 serverCheckSocialRequest(fastify)
//             }, 5 * 60 * 1000); // chạy mỗi 5 giay
//         });
        
//     } catch (error) {
//         fastify.log.error(red("❌ Error in Social request Auto Checker:"));
//         fastify.log.error(error);
//     }
// }   