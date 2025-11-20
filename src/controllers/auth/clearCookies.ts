import { FastifyReply } from 'fastify';

export const clearAuthCookies = (reply: FastifyReply) => {
  const cookiesToClear = ["session-token","refresh-token"];
  const isProduction = process.env.NODE_ENV === "production";

  cookiesToClear.forEach((cookie) => {
    reply.clearCookie(cookie, {
      path: '/', // Phải khớp với path khi set cookie
      secure: isProduction, // Production: true | Development: false
      sameSite: 'lax', // Đảm bảo khớp với sameSite khi set cookie
      domain: isProduction ? ".likepion.com" : undefined, // Chỉ dùng domain khi ở production
    });
  });
};
export const clearAccessTokenCookies = (reply: FastifyReply) => {
  const cookiesToClear = ["session-token"];
  const isProduction = process.env.NODE_ENV === "production";

  cookiesToClear.forEach((cookie) => {
    reply.clearCookie(cookie, {
      path: '/', // Phải khớp với path khi set cookie
      secure: isProduction, // Production: true | Development: false
      sameSite: 'lax', // Đảm bảo khớp với sameSite khi set cookie
      domain: isProduction ? ".likepion.com" : undefined, // Chỉ dùng domain khi ở production
    });
  });
};
