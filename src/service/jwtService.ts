import dotenv from "dotenv";
import { FastifyInstance } from "fastify";
dotenv.config();

// Định nghĩa type cho user (nếu chưa có, tham khảo từ trước)
interface User {
  id: number;
  email: string;
  profile: {
    username: string;
    role: string;
  };
}

export const generateAccessToken = async (fastify: FastifyInstance, user: User) => {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.profile.username,
    role: user.profile.role,
  };

  const accesstoken = await fastify.jwt.sign(
    payload,
    { algorithm: "HS256", expiresIn: "30m" }
  );

  return accesstoken
};

export const generateRefreshToken = async (fastify: FastifyInstance, user: User) => {
  const payload = {
    id: user.id,
  };

  const refreshToken =await fastify.jwt.sign(
    payload,
    { algorithm: "HS256", expiresIn: "7d" }
  );
  return refreshToken
};

export const generateTokens = async (fastify: FastifyInstance, user: User) => {
  const accessToken = await generateAccessToken(fastify, user);
  const refreshToken = await generateRefreshToken(fastify, user);

  return { accessToken, refreshToken };
};