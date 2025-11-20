import fp from "fastify-plugin";
import fastifyCors from "@fastify/cors";

const parseOrigin = (originEnv: string | undefined) => {
  if (!originEnv) return false;
  if (originEnv.includes(",")) {
    return originEnv.split(",").map(origin => origin.trim());
  }
  return originEnv;
};

export default fp(async (fastify) => {
  const env = process.env.NODE_ENV;
  const origin =
    env === "production"
      ? parseOrigin(process.env.CORS_ORIGIN_PRODUCTION)
      : parseOrigin(process.env.CORS_ORIGIN_LOCAL);

  fastify.register(fastifyCors, {
    origin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
});
