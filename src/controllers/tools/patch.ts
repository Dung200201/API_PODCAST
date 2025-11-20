import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";

// Xem tool running
export const checkToolRunning = async (
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { id_tool, estimate_time, thread_number }:any = request.query;

    const tool = await fastify.prisma.tools.findUnique({
      where: { id_tool: id_tool },
    });
    
    if (!tool) {
      return reply.status(404).send({
        message: "Tool not found!",
        success: false,
      });
    }
  
    // Kiểm tra xem package có tồn tại không
    const updatedTool  = await fastify.prisma.tools.update({
        where: { id_tool: id_tool },
        data: { status: "running", time: new Date().toISOString(), estimate_time: String(estimate_time), thread_number:Number(thread_number)  },
    });

    if (!updatedTool) {
      return reply.status(404).send({
        message: "Not found!",
        success: false,
      });
    }

    return reply.status(200).send({
      message: "Tool is running!",
      success: true,
    });
  } catch (error: any) {
    handleErrorResponse(reply, error);
  }
};
