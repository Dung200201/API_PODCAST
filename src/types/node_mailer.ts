import { Locale } from "../lib/i18n";

export type ISendMailOptions = {
    to: string;                  // Email người nhận
    subject: string;             // Chủ đề email
    html?: string;               // Nội dung HTML (nên có)
    text?: string;               // Nội dung dạng text (fallback)
    language?:Locale;
    attachments?: {
      filename: string;
      path: string;             // Đường dẫn file
    }[];
};

export interface ISendMailBody {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}