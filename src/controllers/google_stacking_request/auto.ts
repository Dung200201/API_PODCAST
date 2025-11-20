import { FastifyInstance } from "fastify";

export const serverCheckGoogleStackingRequest = async (
  fastify: FastifyInstance,
) => {
  try {
    // 1. Lấy tối đa 20 request cần xử lý kèm theo link liên quan
    const requests = await fastify.prisma.googleStackingRequest.findMany({
      where: {
        status: { in: ["running", "connecting"] },
      },
      take: 5,
      orderBy: { updatedAt: "asc" },
      include: {
        ggStackingLinks: {
          select: { status: true },
        },
      },
    });

    if (!requests || requests?.length === 0) return;

    // 2. Lặp từng request và xử lý theo điều kiện
    for (const request of requests) {
      const { id, status, stacking_connect, ggStackingLinks } = request;
      const linkStatuses = ggStackingLinks.map((link: any) => link.status);
      if (status === "running") {
        // Đếm các link đang active
        const activeLinkCount = linkStatuses.filter((s: any) =>
          ["finish"].includes(s)
        ).length;
        console.log("activeLinkCount", activeLinkCount);
        
        if (activeLinkCount ===  ggStackingLinks?.length) {
          const isConnectEnabled = stacking_connect?.trim() !== "disable";
          if (!isConnectEnabled) {
            // Nếu không có kết nối → mark completed
            await fastify.prisma.googleStackingRequest.update({
              where: { id },
              data: { status: "completed" },
            });
            continue;
          }

          // Nếu có kết nối → chuyển sang connecting
          await fastify.prisma.$transaction([
            fastify.prisma.googleStackingRequest.update({
              where: {
                id,
                status: "running",
              },
              data: { status: "connecting" },
            }),
            fastify.prisma.googleStackingLink.updateMany({
              where: { ggStackingRequestId: request.id },
              data: { status: "connect" },
            }),
          ]);
        }

      } else if (request.status === "connecting") {
        // Đếm các link đang trong trạng thái connect
        const connectingCount = linkStatuses.filter((s: any) =>
          ["connect", "connecting"].includes(s)
        ).length;

        if (connectingCount === 0) {
          // Không còn link nào đang kết nối → mark completed
          await fastify.prisma.googleStackingRequest.update({
            where: { id },
            data: { status: "completed" },
          });
        }
      }
    }


  } catch (error) {
    fastify.log.error("❌ TOOL Error:", error);
  }
};
