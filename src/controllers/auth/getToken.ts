import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { clearAccessTokenCookies } from "./clearCookies";

export async function getToken(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const token =
      request.headers["authorization"]?.replace("Bearer ", "") ||
      request.cookies["session-token"];

    if (!token) {
      return reply.status(200).send({token: token}); 
    }

    return reply.status(200).send({
      token:token,
      success: true
    }); 
  } catch (error:any) {
    if (error.code === "FAST_JWT_EXPIRED") {
      clearAccessTokenCookies(reply);
      return reply.status(401).send({ success: false, message: "Expired tokens!" });
    }
    if (error.code === "FAST_JWT_INVALID") {
      clearAccessTokenCookies(reply);
      return reply.status(401).send({ success: false, message: "Invalid token" });
    }
    return reply.code(401).send({ message: "Unauthorized" });
  }
}
