import { FastifyPluginAsync } from "fastify";
import { getAllMails } from "../../../controllers/mails/getall";
import { sendMail } from "../../../controllers/mails/send";
import { ISendMailBody } from "../../../types/node_mailer";
import { checkAppPassword } from "../../../controllers/mails/check";
import { createGmail } from "../../../controllers/gmail/create";

const deposit: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    fastify.get("/get-all", async (req, reply) => {
        await getAllMails(fastify, req, reply)
    });
    fastify.post("/check-email-appPassword", async (req, reply) => {
        await checkAppPassword(fastify, req, reply)
    });
    fastify.post<{ Body: ISendMailBody }>("/send", async (req, reply) => {
        await sendMail(fastify, req, reply)
    });

    fastify.post<{ Body: ISendMailBody }>("/create", async (req, reply) => {
        await createGmail(fastify, req, reply)
    });
    // fastify.get("/get-all",{ preHandler: [fastify.authenticate, fastify.authorize(["admin"])] }, async (req, reply) => {
    //     await getAllMails(fastify, req, reply)
    // });
};

export default deposit;
