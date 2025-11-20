import { z } from "zod";

export const GmailSettingSchema = z.object({
  mail_support: z.string().email(),
  mail_sender: z.string().email(),
  smtp_host: z.string().min(3),
  smtp_port: z.number().min(1).max(65535),
  mail_username: z.string().min(1),
  password: z.string().min(1).optional(),
  mail_enabled: z.boolean(),
  mail_support_hidden: z.boolean(),
});
export const TelegramSettingSchema = z.object({
  telegram_support: z.string(),
  telegram_support_hidden: z.boolean(),
});

// Type TypeScript tự sinh
export type GmailSettingRequest = z.infer<typeof GmailSettingSchema>;
export type TelegramSettingRequest = z.infer<typeof TelegramSettingSchema>;
