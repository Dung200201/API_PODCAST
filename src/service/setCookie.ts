import { FastifyReply } from "fastify";
import crypto from "crypto";

export const setAuthCookies = (
  reply: FastifyReply,
  data:any
) => {
  const isProduction = process.env.NODE_ENV === "production";
  // CSRF Protection (Chỉ dùng trong production)
  if (isProduction) {
    const csrfToken = crypto.randomBytes(32).toString("hex");
    
    // Gửi CSRF token trong header
    reply.header("x-csrf-token", csrfToken);

    // Secure Cookies với tiền tố __Host-
    reply.setCookie("session-token", data.accessToken, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 3600,
      priority: "high",
      domain: ".likepion.com",
    });

    if(data.refreshToken){
      reply.setCookie("refresh-token", data.refreshToken, {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 604800,
        priority: "high",
        domain: ".likepion.com",
      });
    }
    
    return
  }else{
     // Set Access Token
    reply.setCookie("session-token", data.accessToken, {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax", // Lax nếu frontend khác domain
      maxAge: 3600, // 15 phút
      priority: "high",
    });

    // Set Refresh Token
    if(data.refreshToken){
      reply.setCookie("refresh-token", data.refreshToken, {
        path: "/",
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict",
        maxAge: 604800, // 7 ngày
        priority: "high",
      });
    }
    
    return
  }
};
