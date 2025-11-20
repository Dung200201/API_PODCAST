import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";



function spinText(input: string): string {
    return input.replace(/\{([^{}]+)\}/g, (_, group) => {
        const options = group.split('|');
        return options[Math.floor(Math.random() * options.length)];
    });
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorate('spinText', spinText);
});