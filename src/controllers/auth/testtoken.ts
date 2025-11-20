// checkToken.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function checkToken(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const {token}:any = request.body;
    console.log(token);
    
    if (!token) {
      return reply.status(404).send({ success: false, message: "Regret! You are not logged in!" });
    }
    const decoded:any = await fastify.jwt.verify(token);
    return reply.status(200).send({
      user: decoded,
      success: true
    }); 
  } catch (error) {
    return reply.status(500).send({ error: 'Internal Server Error' });
  }
}
