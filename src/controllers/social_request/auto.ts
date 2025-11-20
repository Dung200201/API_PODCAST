// import { FastifyInstance } from "fastify";

// export const serverCheckSocialRequest = async (
//   fastify: FastifyInstance,
// ) => {
//   try {
//     const request = await fastify.prisma.socialRequest.findFirst({
//       where: {
//         status: { in: ["running"] }, // có thể thêm 'waiting' nếu muốn
//       },
//       select: {
//         id: true,
//         status: true,
//       },
//     });

//     if (!request) {
//       fastify.log.info("✅ Social Request: No social request in 'running' status found.");
//       return;
//     }

//     if (request.status === "running") {
//       const activeLinkCount = await fastify.prisma.socialLink.count({
//         where: {
//           socialRequestId : request.id, // ⚠️ sửa chỗ này: nên là socialGroupId chứ không phải id
//           status: { in: ["new", "running"] },
//         },
//       });

//       if (activeLinkCount === 0) {
//         await fastify.prisma.socialRequest.update({
//           where: { id: request.id },
//           data: { status: "completed" },
//         });
//         fastify.log.info(`✅ Social request ${request.id} marked as completed.`);
//       } else {
//         fastify.log.info(`🕐 Social request  ${request.id} still has ${activeLinkCount} active accounts in 'uncheck' or 'checking' status.`);
//       }
//     }
//   } catch (error) {
//     fastify.log.error("❌ TOOL Error:", error);
//   }
// };
