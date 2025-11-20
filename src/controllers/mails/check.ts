import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { verifyEmail } from "../../service/verifyEmail";
import { sleep } from "../../utils/sleep";

function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

export const checkAppPassword = async (
    fastify: FastifyInstance,
    req: FastifyRequest,
    reply: FastifyReply
) => {
    const body = req.body;
    const inputs = Array.isArray(body) ? body : [body];

    if (!inputs.every(item => item.email && item.app_password)) {
        return reply.status(400).send({ success: false, message: "Invalid input format" });
    }

    const batchSize = 10; // số lượng email chạy 1 batch
    const batches = chunkArray(inputs, batchSize);

    try {
        const allResults: any[] = [];

        for (const batch of batches) {
            // Chạy song song batch hiện tại (batchSize email)
            const batchResults = await Promise.all(
                batch.map(async ({ email, app_password }) => {
                    try {
                        const result = await verifyEmail(email, app_password);
                        return { email, success: true, result };
                    } catch (error) {
                        return { email, success: false, error: (error as Error).message || error };
                    }
                })
            );

            allResults.push(...batchResults);
            sleep(10000)
            // Có thể thêm delay nhỏ ở đây nếu cần tránh rate limit
            // await new Promise(r => setTimeout(r, 100)); // delay 100ms
        }

        return reply.status(200).send({ success: true, results: allResults });
    } catch (error) {
        return reply.status(500).send({
            success: false,
            message: 'Failed to verify app passwords in batches.',
            error: (error as Error).message || error,
        });
    }
};