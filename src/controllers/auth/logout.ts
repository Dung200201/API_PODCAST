import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { clearAuthCookies } from "./clearCookies";
import { Locale, translations } from "../../lib/i18n";

// function Logout account
export const logout = async(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const token =
    request.headers["authorization"]?.replace("Bearer ", "") ||
    request.cookies["session-token"];

    const lang = request.headers["accept-language"] || "";
        const rawLang = lang.startsWith("vi") ? Locale.vi : Locale.en;
        const language = rawLang;

    if (!token) {
      return reply.status(401).send({ success: false, message: `${translations[language].auth.notLoggedIn}` });
    }
    // Clear session-token cookie
    await clearAuthCookies(reply);

    reply.status(200).send({ message: `${translations[language].auth.logoutSuccess}`, success: true });
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};
