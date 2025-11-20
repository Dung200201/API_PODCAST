import validator from "validator";
import { Locale, translations } from "../lib/i18n";
type ICheckUrl = {
    urls: string | string[];
    maxUrls?: number;
    language: Locale;
}

export const validateUrls = ({ urls, maxUrls = 1000, language }: ICheckUrl) => {
    const urlArray = Array.isArray(urls) ? urls.filter(Boolean) : [urls];
    const uniqueUrls = Array.from(new Set(urlArray));
    
    if (uniqueUrls.length > maxUrls) {
      return {
        success: false,
        message: `${translations[language].services.tooManyUrlsFirst} ${maxUrls} ${translations[language].services.tooManyUrlsSecond}`,
      };
    }
  
    const validUrls: string[] = [];
    const invalidUrls: string[] = [];
  
    for (const url of uniqueUrls) {
      if (
        validator.isURL(url, {
          protocols: ["https", "http"],
          require_protocol: true,
        })
      ) {
        validUrls.push(url);
      } else {
        invalidUrls.push(url);
      }
    }
  
    return {
      success: validUrls.length > 0,
      validUrls,
      invalidUrls,
      message: invalidUrls.length
        ? `${translations[language].services.invalidUrls}`
        : undefined,
    };
  };
  
