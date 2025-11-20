import { FastifyInstance } from "fastify";

export const serverCheckSocialGroup = async (
  fastify: FastifyInstance,
) => {
  try {
    const request = await fastify.prisma.socialGroup.findFirst({
      where: {
        status: { in: ["running"] }, // có thể thêm 'waiting' nếu muốn
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!request) {
      // fastify.log.info("✅ No social group in 'running' status found.");
      return;
    }

    if (request.status === "running") {
      const activeLinkCount = await fastify.prisma.socialAccount.count({
        where: {
          socialGroupId: request.id, // ⚠️ sửa chỗ này: nên là socialGroupId chứ không phải id
          status: { in: ["uncheck", "checking"] },
        },
      });

      if (activeLinkCount === 0) {
        await fastify.prisma.socialGroup.update({
          where: { id: request.id },
          data: { status: "completed" },
        });
        fastify.log.info(`✅ Social group ${request.id} marked as completed.`);
      } else {
        fastify.log.info(`🕐 Social group ${request.id} still has ${activeLinkCount} active accounts in 'uncheck' or 'checking' status.`);
      }
    }
  } catch (error) {
    fastify.log.error("❌ TOOL Error:", error);
  }
};
