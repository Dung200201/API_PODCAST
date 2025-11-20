// refreshToken.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { setAuthCookies } from '../../service/setCookie';
import { generateAccessToken } from '../../service/jwtService';
import { getUserPreferences } from '../../service/getLanguageDb';
import { translations } from '../../lib/i18n';

export async function refreshToken(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Lấy refresh token từ cookie
    const refreshToken =  request.headers["authorization"]?.replace("Bearer ", "") ||
    request.cookies["refresh-token"];

    if (!refreshToken) {
      return reply.status(401).send({ error: 'No refresh token provided' });
    }

    // Verify refresh token
    const decoded:any = await fastify.jwt.verify(refreshToken);
    const user:any = await fastify.prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id:true,
      }
    });
    const {language} = await getUserPreferences(fastify,request,user.id);

    if (!user) {
      return reply.status(404).send({ message: `${translations[language].token.notFound}` });
    }

    // Create a new access token using the refresh token data
    const accessToken = await generateAccessToken(fastify, user);

    setAuthCookies(reply, { accessToken }); // ✅ Giờ data.accessToken sẽ đúng

    // Return new access token in the response
    return reply.status(200).send({ message:`${translations[language].token.refreshed}`, succcess: true });
  } catch (error) {
    return reply.status(401).send({ error: 'Failed to refresh token' });
  }
}
