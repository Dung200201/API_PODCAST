import fp from 'fastify-plugin'
import cookie, { FastifyCookieOptions } from '@fastify/cookie'

/**
 * This plugin registers the fastify-cookie plugin
 *
 * @see https://github.com/fastify/fastify-cookie
 */
export default fp<FastifyCookieOptions>(async (fastify) => {
  fastify.register(cookie, {
    secret: process.env.COOKIES_SECRET, // for cookies signature
    parseOptions: {}     // options for parsing cookies
  })
})