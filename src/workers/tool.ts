// import { FastifyInstance } from "fastify";
// import { serverCheckTool } from "../controllers/tools/auto";
// import { cyan, red, yellow } from "../utils/log-color";

// export default async function (fastify: FastifyInstance) {
//   try {
//     fastify.log.info(cyan("🛠️ TOOL: Check Tool is Running..."));

//     fastify.ready().then(() => {
//       setInterval(() => {
//         fastify.log.info(yellow("🔁 TOOL: Running periodic tool check..."));
//         serverCheckTool(fastify);
//       }, 5 * 60 * 1000); // chạy mỗi 1 phút (60,000 ms)
//     });

//   } catch (error) {
//     fastify.log.error(red("❌ TOOL: Error starting Tool Checker:"));
//     console.error(error);
//     fastify.log.error("❌ SOCIAL: Failed to start Social Account Runner:", error);
//   }
// }
