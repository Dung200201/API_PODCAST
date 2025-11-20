import { FastifyReply } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client"; // Nếu dùng Prisma ORM

export const handleErrorResponse = (reply: FastifyReply, error: any) => {
  // Zod validation error
  if (error instanceof ZodError) {
    const formattedErrors = error.errors.map((err) => ({
      path: err.path.join("."),
      message: err.message,
    }));

    return reply.status(400).send({
      success: false,
      message: "Validation Error",
      errors: formattedErrors,
    });
  }

  // Prisma client error
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return reply.status(400).send({
      success: false,
      message: "Database Error",
      code: error.code,
    });
  }

  // Prisma validation error or unknown Prisma error
  if (
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  ) {
    console.error("Prisma error:", error); // Ghi log nội bộ
    return reply.status(500).send({
      success: false,
      message: error?.message || "Internal Server Error",
      data: null,
    });
  }

  // Unknown error
  console.error("Unknown error:", error);
  return reply.status(500).send({
    success: false,
     message: error?.message || "Internal Server Error",
    data: null,
  });
};