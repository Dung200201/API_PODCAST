    import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
    import { handleErrorResponse } from "../../utils/handleError";
    import { getPaginationData } from "../../utils/pagination";

    export const getAllMails = async (
    fastify: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply
    ) => {
    try {
        const startTime = Date.now(); // Lưu thời gian request bắt đầu
        const {
        //    _s = "",
        _page = 1,
        _limit = 10,
        _code = "",
        _order = "desc",
        } = request.query as any;

    
        // Tạo điều kiện tìm kiếm trực tiếp
        const where: any = { 
            domains: "likepion"
         };

        if (_code) where.code = { contains: _code };
    
        // Truy vấn dữ liệu
        const [data, totalItems] = await Promise.all([
        fastify.prisma.mails.findMany({
            where,
            skip: (_limit === "-1" ? 0 : (Number(_page || 1) - 1) * Number(_limit || 10)),
            take: (_limit === "-1" ? undefined : Number(_limit || 10)),
            orderBy: { updatedAt: _order || "desc" }
        }),
        fastify.prisma.mails.count({ where }),
        ]);
    
        // Nếu không có dữ liệu tìm thấy
        if (!data || data.length === 0) {
        return reply
            .status(404)
            .send({ message: "No data found!", success: false });
        }

        // Chuyển đổi thời gian sang múi giờ Việt Nam
        const formattedData = data.map((mail:any) => ({
            ...mail,
            received_at: new Date(mail.received_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
        }));
    
        // Tính toán dữ liệu phân trang
        const pagination = getPaginationData(Number(_page), Number(_limit), totalItems, request.url, startTime);
    
        return reply.status(200).send({
        message: "Retrieve data successfully!",
        success: true,
        pagination,
        mails: formattedData,
        });
    } catch (error) {
        handleErrorResponse(reply, error);
    }
    };
