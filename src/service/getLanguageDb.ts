import { FastifyInstance, FastifyRequest } from "fastify";
import { DEFAULT_LOCALE, Locale } from "../lib/i18n";

// Hàm helper: check giá trị có hợp lệ với enum Locale
const isValidLocale = (lang: any): lang is Locale => {
  return Object.values(Locale).includes(lang);
};

// Detect từ trình duyệt
export const detectLocaleFromBrowser = (request?: FastifyRequest): Locale => {
  const acceptLanguage = request?.headers["accept-language"];
  const lang = acceptLanguage?.split(",")[0]?.split("-")[0];
  return lang === "vi" ? Locale.vi : DEFAULT_LOCALE;
};

// Hàm chính: trả về ngôn ngữ & timezone nếu có
export const getUserPreferences = async (
  fastify: FastifyInstance,
  request?: FastifyRequest,
  userId?: string,
  languages?: string,
): Promise<{ language: Locale }> => {
    let language: Locale = DEFAULT_LOCALE;

    // Ưu tiên xử lý nếu truyền trực tiếp
    if (languages) {
      if (languages === "auto") {
        language = detectLocaleFromBrowser(request);
      } else if (isValidLocale(languages)) {
        language = languages;
      } else {
        // fallback nếu truyền sai
        language = DEFAULT_LOCALE;
      }
  
      return { language };
    }

    if (userId) {
        const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: {
            profile: {
            select: {
                language: true,
            },
            },
        },
        });

        const userLang = user?.profile?.language;

        // Nếu ngôn ngữ là "auto" hoặc không hợp lệ → lấy từ trình duyệt
        if (!userLang || userLang === "auto" || !isValidLocale(userLang)) {
        language = detectLocaleFromBrowser(request);
        } else {
        language = userLang;
        }
    } else {
        // Không có user → lấy theo trình duyệt
        language = detectLocaleFromBrowser(request);
    }

  return { language };
};