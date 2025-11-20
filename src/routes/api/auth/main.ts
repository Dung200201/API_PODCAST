import { FastifyPluginAsync } from "fastify";
import { logout, signin, signup, VerifyToken, forgetPassword, changePasswordNew, resetPassword  } from "../../../controllers/auth";
import { getSession } from "../../../controllers/auth";
import { refreshToken } from "../../../controllers/auth/refreshToken";
import { checkToken } from "../../../controllers/auth/testtoken";
import { getToken } from "../../../controllers/auth/getToken";
import { verifyEmail } from "../../../controllers/auth/verify-email";
import { sendVerificationEmailApi } from "../../../controllers/auth/resend_confirm_email";

const user: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // routes signup
  fastify.post("/signup", { config: { rateLimit: { max: 15, timeWindow: '10 seconds' } } }, async function (request, reply) {
    await signup(fastify, request, reply);
  });

  // routes signin
  fastify.post("/login", { config: { rateLimit: { max: 15, timeWindow: '10 seconds' } } }, async function (request, reply) {
    await signin(fastify, request, reply);
  });

  // routes logout
  fastify.post("/logout", { config: { rateLimit: { max: 15, timeWindow: '10 seconds' } } }, async function (request, reply) {
    await logout(fastify, request, reply);
  });

  // routes change password
  fastify.post("/forget-password", { config: { rateLimit: { max: 15, timeWindow: '10 seconds' } } }, async function (request, reply) {
    await forgetPassword(fastify, request, reply);
  });

  // reset forget password 
  fastify.post("/reset-password", { config: { rateLimit: { max: 15, timeWindow: '10 seconds' } } }, async function (request, reply) {
    await resetPassword(fastify, request as any, reply);
  });

  // change password new
  fastify.post("/change-password", { config: { rateLimit: { max: 15, timeWindow: '10 seconds' } } }, async function (request, reply) {
    await changePasswordNew(fastify, request as any, reply);
  });

  // verify token
  fastify.post("/verify-token", { config: { rateLimit: { max: 15, timeWindow: '10 seconds' } } }, async function (request, reply) {
    await VerifyToken(fastify, request, reply);
  });
  // Check xem token gửi lên có đúng k
  fastify.post("/verify-email", { config: { rateLimit: { max: 10, timeWindow: '10 seconds' } } }, async function (request, reply) {
    await verifyEmail(fastify, request, reply);
  });
  // Gửi lại token về email khi người dùng yêu cầu
  fastify.post("/send-verification-email", { config: { rateLimit: { max: 1, timeWindow: '15 seconds' } } }, async function (request, reply) {
    await sendVerificationEmailApi(fastify, request, reply);
  });

  // verify token
  fastify.post("/refresh-token", { config: { rateLimit: { max: 15, timeWindow: '10 seconds' } } }, async function (request, reply) {
    await refreshToken(fastify, request, reply);
  });

  // verify token
  fastify.get("/session", async function (request, reply) {
    await getSession(fastify, request, reply);
  });

  // check token
  fastify.post("/check-token", { config: { rateLimit: { max: 15, timeWindow: '10 seconds' } } }, async function (request, reply) {
    await checkToken(fastify, request, reply);
  });

  fastify.get("/token", async function (request, reply) {
    await getToken(fastify, request, reply);
  });
 
};

export default user;
