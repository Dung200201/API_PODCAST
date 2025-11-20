export interface GmailSettingRequest {
    mail_support: string;
    mail_sender: string;
    smtp_host: string;
    smtp_port: number;
    username: string;
    password: string;
    mail_enabled: boolean;
    mail_support_hidden: boolean;
}
