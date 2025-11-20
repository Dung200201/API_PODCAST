import { FastifyPluginAsync } from "fastify";
import { createOrder, capturePayment } from "../../../controllers/pay/paypal/paypal";
import { createVietQR } from "../../../controllers/pay";
import { getBanks } from "../../../controllers/pay/vietqr/vietqr";
import { checkTransactionStatus, createPayment } from "../../../controllers/pay/pay2s/pay2s";
import { createQrcodeUSDT } from "../../../controllers/pay/trc20/trc20";

const pay: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    fastify.post("/paypal/create-order", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await createOrder(fastify, req, reply);
    });

    fastify.get("/paypal/complete-order", async (req, reply) => {
        await capturePayment(fastify, req, reply);
    });

    fastify.get("/paypal/cancel-order", async (req, reply) => {
        reply.redirect("/");
    });

    // vietqr
    // create 
    fastify.post("/vietqr/create-order", { preHandler: [fastify.authenticate] }, async (req, reply) => {
        await createVietQR(fastify, req, reply);
    });

    // get bank
    fastify.get("/vietqr/get-banks", async (req, reply) => {
        await getBanks(fastify, req, reply);
    });

    // pay2s
    // create 
    fastify.post("/pay2s/create-order", async (req, reply) => {
        await createPayment(fastify, req, reply);
    });

    // get bank
    fastify.get("/pay2s/get-transaction/:orderId", async (req, reply) => {
        await checkTransactionStatus(fastify, req, reply);
    });

     // get bank
    fastify.post("/usdt/create-qrcode", async (req, reply) => {
        await createQrcodeUSDT(fastify, req, reply);
    });

};

export default pay;
