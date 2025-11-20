import dotenv from "dotenv";
dotenv.config();

export const getGeminiResponse = async (
  message: string,
  language: string = "English"
): Promise<string> => {
  if (!message) {
    return "Vui lòng cung cấp một tin nhắn.";
  }

  try {
    const { GoogleGenAI } = await import("@google/genai"); // Dynamic import ở đây

    const genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "AIzaSyDS7NELZPOkp-0cMCsGhifdQzNQssgWRdo",
    });

    const stream = await genAI.models.generateContentStream({
      model: "gemini-2.0-flash-001",
      contents: [
        {
          role: "user",
          parts: [{ text: `Trả lời bằng ${language}: ${message}` }],
        },
      ],
    });

    let fullText = "";
    for await (const chunk of stream) {
      fullText += chunk.text;
    }

    return fullText;
  } catch (error: any) {
    console.error("[Gemini AI Error]:", error);
    return `Rất tiếc, tôi không thể xử lý yêu cầu của bạn lúc này. Lỗi: ${
      error.message || "Lỗi không xác định."
    }`;
  }
};
