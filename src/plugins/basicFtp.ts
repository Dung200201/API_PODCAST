import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import { Client } from "basic-ftp";
import fs from "fs";
import dotenv from 'dotenv'; 
dotenv.config();

const ftpPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const client = new Client();

  async function ftpfile(localPath: string, remotePath: string) {
    try {
      await client.access({
        host: process.env.FTP_HOST,
        user: process.env.FTP_USER,
        password: process.env.FTP_PASS,
        secure: false,
      });

      await client.uploadFrom(localPath, remotePath);

      fs.unlinkSync(localPath);
    } catch (error) {
      fastify.log.error("Failed to upload and delete temp file:", error);
      throw error;
    }
  }

  fastify.decorate("ftpfile", { client, ftpfile });

  fastify.addHook("onClose", async () => {
    client.close();
  });
});

export default ftpPlugin;

declare module "fastify" {
  interface FastifyInstance {
    ftpfile: {
      client: Client;
      ftpfile: (localPath: string, remotePath: string) => Promise<void>;
    };
  }
}
