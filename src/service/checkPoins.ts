import { IUser } from "../types/user";

interface CheckPointsResult {
    isEnough: boolean;
    isExpired: boolean;
    totalPoints: number;
    neededPoints: number;
}

export const checkUserPoints = async (
    fastify: any,
    user: IUser,
    userTotalUsed: number
): Promise<CheckPointsResult> => {

    if (user.expiresAt! < new Date()) {
        return {
            isEnough: false,
            totalPoints: 0,
            neededPoints: 0,
            isExpired: true
        };
    }

    const [
        creditSum,
        debitSum,
        entityRequests,
        indexRequests,
        socialRequests,
        ggStackings,
        blog20Requests,
        podcastRequests
    ] = await Promise.all([
        fastify.prisma.transaction.aggregate({
            where: { userId: user?.id, type: 'credit' },
            _sum: { points: true },
        }),
        fastify.prisma.transaction.aggregate({
            where: { userId: user?.id, type: 'debit' },
            _sum: { points: true },
        }),

        // 2. Tính điểm sử dụng từ dịch vụ entity_request những trạng thái đang chạy mà chưa trừ điểm
        fastify.prisma.entityRequest.findMany({
            where: {
                userId: user?.id,
                status: { in: ["new", "pending", "connecting", "running"] },
                deletedAt: null,
            },
            select: {
                auction_price: true,
                entity_limit: true,
            },
        }),
        fastify.prisma.indexRequest.findMany({
            where: {
                userId: user?.id,
                status: { notIn: ['running', 'completed', 'new'] },
                deletedAt: null,
            },
            select: { id: true },
        }),
        fastify.prisma.socialRequest.findMany({
            where: {
                userId: user?.id,
                status: { notIn: ["completed", "cancel", "new"] },
                deletedAt: null,
            },
            select: {
                id: true,
                auction_price: true,
                social_links: {
                    where: { deletedAt: null },
                    select: { id: true },
                },
            },
        }),
        fastify.prisma.googleStackingRequest.findMany({
            where: {
                userId: user?.id,
                status: { notIn: ["draft", "cancel", "completed"] },
                deletedAt: null,
            },
            select: {
                id: true,
                auction_price: true,
                ggStackingLinks: {
                    where: { deletedAt: null },
                    select: { id: true },
                },
            },
        }),

        // Query Blog2.0
        fastify.prisma.blog20Request.findMany({
            where: {
                userId: user?.id,
                status: { notIn: ["draft", "cancel"] },
                deletedAt: null,
            },
            select: {
                id: true,
                typeRequest: true,
                auction_price: true,
                blog20_link: {
                    where: { deletedAt: null },
                    select: { id: true },
                },
                blogGroupId: true,
                blog20group: {
                    select: {
                        id: true,
                        blog20_account: {
                            where: { deletedAt: null },
                            select: { id: true },
                        },
                    },
                },
            },
        }),

        // Query Podcast
        fastify.prisma.podcastRequest.findMany({
            where: {
                userId: user?.id,
                status: { notIn: ["completed", "cancel", "draft"] },
                deletedAt: null,
            },
            select: {
                id: true,
                auction_price: true,
                target: true,
            },
        }),
    ]);


    // Tính tổng điểm hiện có của 
    const totalPoints = (creditSum._sum.points || 0) - (debitSum._sum.points || 0);

    // Tính điểm entity
    const entityUsed = entityRequests.reduce((sum: any, req: any) => {
        const price = Number(req.auction_price) || 0;
        const limit = Number(req.entity_limit) || 0;
        return sum + price * limit;
    }, 0);


    const indexRequestIds = indexRequests?.map((r: any) => r.id)

    const indexLinksCount = indexRequestIds.length
        ? await fastify.prisma.indexLink.count({
            where: {
                indexRequestId: { in: indexRequestIds },
            },
        })
        : 0;

    const indexLinksUsed = user.type === "advanced" ?
        indexLinksCount * 2 : user.type === "priority" ?
            indexLinksCount * 3 : indexLinksCount * 1

    // Tính điểm social
    const socialUsed = socialRequests.reduce((sum: any, req: any) => {
        const price = Number(req.auction_price) || 0;
        const linkCount = req.social_links.length;
        return sum + price * linkCount;
    }, 0);

    // Tính điểm ggStacking
    const ggStackingUsed = ggStackings.reduce((sum: any, req: any) => {
        const price = Number(req.auction_price) || 0;
        const linkCount = req.ggStackingLinks.length;
        return sum + price * linkCount;
    }, 0);

    // Tính điểm Blog2.0
    const blog20Used = blog20Requests.reduce((sum: number, req: any) => {
        const price = Number(req.auction_price) || 0;
        let count = 0;

        if (req.typeRequest === "register") {
            // Dựa vào số lượng account trong group
            count = req.blog20group?.blog20_account?.length || 0;
        } else if (req.typeRequest === "post") {
            // Dựa vào số lượng link trong request
            count = req.blog20_link?.length || 0;
        }
        return sum + price * count;
    }, 0);

    // Tính điểm Podcast
    const podcastUsed = podcastRequests.reduce((sum: number, req: any) => {
        const price = Number(req.auction_price) || 0;
        const target = Number(req.target) || 0;
        return sum + price * target;
    }, 0);

    // Tính điểm thiếu (nếu không đủ)
    const totalUsed = entityUsed + indexLinksUsed + userTotalUsed + socialUsed + ggStackingUsed + blog20Used + podcastUsed;

    // 🛠️ Kiểm tra điểm có đủ hay không
    const neededPoints = Math.abs(totalPoints - totalUsed);
    console.log("totalPoints", totalPoints);
    console.log("totalUsed", totalUsed);
    console.log("ggStackingUsed", ggStackingUsed);
    console.log("socialUsed", socialUsed);
    console.log("entityUsed", entityUsed);
    console.log("blog20Used", blog20Used);
    console.log("indexLinksUsed", indexLinksUsed);
    console.log("userTotalUsed", userTotalUsed);

    return {
        isEnough: totalPoints >= totalUsed,
        totalPoints,
        neededPoints,
        isExpired: false
    };
};
