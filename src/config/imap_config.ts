export const imapConfig:any = {
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    authTimeout: 15000,
    keepalive: {
        interval: 3000, // ping server mỗi 3s để giữ kết nối
        idleInterval: 300000, // sau 5 phút không hoạt động thì ping lại
        forceNoop: true
    }
};