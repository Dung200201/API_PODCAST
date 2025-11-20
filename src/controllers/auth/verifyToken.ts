// checkToken.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import dotenv from "dotenv";
dotenv.config();

export async function VerifyToken(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { token }: any = request.body;
    if (!token) {
      return reply.status(404).send({ message: "Token not found!" });
    }
    const decoded: any = fastify.jwt.verify(
      token
    );

    if (decoded) {
      return reply
        .status(200)
        .send({ message: "Token is valid!", success: true });
    } else {
      return reply
        .status(401)
        .send({ message: "Invalid token!", success: false });
    }
  } catch (error) {
    handleErrorResponse(reply, error);
  }
}
