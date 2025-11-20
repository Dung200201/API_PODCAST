import fp from 'fastify-plugin'
import nodemailer from 'nodemailer'
import { Transporter } from 'nodemailer';

/**
 * This plugin registers the nodemailer plugin
 *
 * @see https://nodemailer.com/
 */
export default fp(async (fastify, opts) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, 
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER, 
      pass: process.env.SMTP_PASS
    }
  })

  fastify.decorate('nodemailer', transporter);
})

// Use TypeScript
declare module 'fastify' {
  interface FastifyInstance {
    nodemailer: Transporter;
  }
}