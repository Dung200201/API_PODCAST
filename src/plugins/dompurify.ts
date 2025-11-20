import fp from "fastify-plugin";
import DOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { FastifyInstance } from "fastify";

// Cấu hình DOMPurify với JSDOM (Chỉ cần tạo một lần)
const window = new JSDOM("").window;
const purify = DOMPurify(window);

/**
 * Mở rộng FastifyInstance để thêm phương thức sanitize
 */
declare module "fastify" {
  interface FastifyInstance {
    sanitize: (html: string) => string;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorate("sanitize", (html: string) => {
    // return purify.sanitize(html, {
    //   // ALLOWED_TAGS: ["p", "b", "i", "strong", "em", "ul", "ol", "li", "br","a"], // Chỉ cho phép các thẻ cơ bản
    //   // ALLOWED_ATTR: ["href"] // Không cho phép bất kỳ thuộc tính nào
    //   ALLOWED_TAGS: ["a"],
    //   ALLOWED_ATTR: ["href"]
    // });
    const sanitized = purify.sanitize(html, {
      ALLOWED_TAGS: ["p", "a", "br"],
      ALLOWED_ATTR: ["href"]
    });

    const plainText = sanitized
      .replace(/<p[^>]*>/gi, '')    
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n');

    return plainText;
  });
});