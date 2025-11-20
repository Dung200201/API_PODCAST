// import Imap from "node-imap";
// import { simpleParser } from "mailparser";
// import { saveEmailsToDatabase } from "../controllers/mails/add";
// import { FastifyInstance } from 'fastify';
// import { imapConfig } from "../config/imap_config";
// import { green, red } from "../utils/log-color";

// export default async function (fastify: FastifyInstance) {
//     const EMAIL_TRANSACTION: string = process.env.EMAIL_TRANSACTION!;
//     const APP_PASSWORD_TRANSACTION: string = process.env.APP_PASSWORD_TRANSACTION!;

//     if (!APP_PASSWORD_TRANSACTION || !EMAIL_TRANSACTION) {
//         fastify.log.error("❌ Missing IMAP credentials");
//         return;
//     }
//     let imap: Imap;

//     const startImapConnection = () => {
//         imap = new Imap({
//             user: EMAIL_TRANSACTION,
//             password: APP_PASSWORD_TRANSACTION,
//             ...imapConfig,

//         });

//         let idleInterval: NodeJS.Timeout;

//         // Thực thi
//         imap.once("ready", function () {
//             fastify.log.info(green("📬 Kết nối IMAP thành công, đang chờ email mới..."));

//             const sock = (imap as any)._sock;
//             sock.on('error', (sockErr: any) => {
//                 fastify.log.error('🔌 Socket-level IMAP error:', {
//                     message: sockErr.message,
//                     code: sockErr.code,
//                     stack: sockErr.stack
//                 });
//                 try { imap.end(); } catch { }
//             });
//             imap.openBox("INBOX", false, async (err, box) => {
//                 if (err) {
//                     fastify.log.error("❌ Lỗi mở hộp thư:", err);
//                     return;
//                 }

//                 fastify.log.info(green(`📂 Đang mở hộp thư: ${box.name}`));

//                 // 👇 Gọi lại IDLE định kỳ mỗi 25 phút
//                 idleInterval = setInterval(() => {
//                     if (imap.state === 'authenticated') {
//                         try {
//                             fastify.log.info("🔄 Thiết lập lại IDLE sau 25 phút...");
//                             (imap as any)._resetKeepAliveTimer?.(); // Nếu dùng patch custom
//                             (imap as any).idle?.();
//                         } catch (e) {
//                             fastify.log.error("⚠️ Lỗi khi thiết lập lại IDLE:", e);
//                         }
//                     }
//                 }, 25 * 60 * 1000);

//                 // Lắng nghe khi có mail mới
//                 imap.on("mail", async (numNewMsgs) => {
//                     fastify.log.info(`📨 Phát hiện ${numNewMsgs} email mới!`);

//                     // Hàm định dạng ngày theo IMAP (DD-MMM-YYYY)
//                     const formatDate = (date: Date): string => {
//                         const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
//                         const day = date.getDate().toString().padStart(2, "0");
//                         return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
//                     };

//                     // Lấy ngày hôm qua
//                     const yesterday = new Date();
//                     yesterday.setDate(yesterday.getDate() - 1);
//                     const sinceDate = formatDate(yesterday);

//                     fastify.log.info(`📅 Ngày tìm kiếm: ${sinceDate}`);

//                     // Tìm email chưa đọc (UNSEEN) từ ngày hôm qua
//                     imap.search(["UNSEEN", ["SINCE", sinceDate], ["SUBJECT", "SHB - Giao dich tai khoan"]], (err, results) => {
//                         if (err) {
//                             fastify.log.error("❌ Lỗi tìm email chưa đọc:", err);
//                             return;
//                         }

//                         if (results.length === 0) {
//                             fastify.log.info("📭 Không có email chưa đọc.");
//                             return;
//                         }

//                         // const latestEmails = results.slice(-20);  
//                         // fastify.log.info(`📩 Lấy ${latestEmails.length} email mới nhất.`);

//                         var fetch = imap.fetch(results, {
//                             bodies: "",
//                             struct: true
//                         });

//                         let emailPromises: Promise<any>[] = [];

//                         fetch.on("message", (msg, seqno) => {
//                             let emailBody = "";

//                             msg.on("body", (stream) => {
//                                 stream.on("data", (chunk) => {
//                                     emailBody += chunk.toString();
//                                 });
//                             });

//                             let emailPromise = new Promise(async (resolve) => {
//                                 msg.once("end", async () => {
//                                     const parsed: any = await simpleParser(emailBody);

//                                     const content = parsed.text || parsed.html || '';
//                                     if (!content.includes("So tien: +")) {
//                                         fastify.log.warn(`⚠️ Email chứa "So tien: +", bỏ qua.`);
//                                         return resolve(null);
//                                     }

//                                     const emailData = {
//                                         messageId: parsed.messageId,
//                                         from: parsed.from?.text || '',
//                                         to: parsed.to?.text || '',
//                                         subject: parsed.subject || '',
//                                         date: parsed.date || new Date(),
//                                         text: parsed.text || '',
//                                         html: parsed.html || '',
//                                     };

//                                     resolve(emailData);
//                                 });
//                             });

//                             emailPromises.push(emailPromise);
//                         });

//                         fetch.once("end", async () => {
//                             let emails = await Promise.all(emailPromises.map(p => p.catch(e => {
//                                 fastify.log.error("❌ Lỗi parse email:", e);
//                                 return null;
//                             })));
//                             fastify.log.info(`📩 Hoàn thành lấy ${emails.length} email mới.`);

//                             emails = emails.filter(email => email !== null);

//                             const data: any = await saveEmailsToDatabase(emails);
//                             if (data) {
//                                 fastify.log.info("✅ Thêm data thành công", data);

//                                 if (results.length > 0) {
//                                     imap.addFlags(results, ["\\Seen"], (err) => {
//                                         if (err) {
//                                             fastify.log.error("❌ Lỗi đánh dấu email là đã đọc:", err);
//                                         } else {
//                                             fastify.log.info("✅ Đã đánh dấu tất cả email là đã đọc.");
//                                         }
//                                     });
//                                 } else {
//                                     fastify.log.info("📭 Không có email nào để đánh dấu.");
//                                 }
//                             }
//                         });
//                     });
//                 });
//             });
//         });

//         imap.once('error', function (err) {
//             console.log(err);
//             reconnect();
//         });

//         // đóng cổng
//         imap.once('end', function () {
//             if (idleInterval) clearInterval(idleInterval);
//             fastify.log.info(red("📴 Kết nối IMAP đã đóng."));
//             reconnect();
//         });

//         imap.connect();
//     }
//     let retryCount = 0;
//     const MAX_RETRY = 10;
//     const reconnect = () => {
//         fastify.log.warn("🔁 Đang thử kết nối lại IMAP sau 30 giây...");
//         if (retryCount >= MAX_RETRY) {
//             fastify.log.error("🚫 Vượt quá số lần thử kết nối IMAP. Dừng lại.");
//             return;
//         }

//         retryCount++;
//         fastify.log.warn(`🔁 Đang thử kết nối lại IMAP lần thứ ${retryCount}/${MAX_RETRY} sau 30 giây...`);

//         if (imap) {
//             try {
//                 imap.removeAllListeners(); // 🔥 QUAN TRỌNG

//                 imap.once("close", () => {
//                     fastify.log.info("✅ Đã đóng kết nối IMAP cũ, bắt đầu reconnect.");
//                     setTimeout(() => {
//                         startImapConnection();
//                     }, 30 * 1000);
//                 });

//                 if (imap.state !== 'disconnected') {
//                     imap.end();
//                 }
//             } catch (_) {
//                 fastify.log.error("⚠️ Gặp lỗi khi cố đóng kết nối cũ.");
//             }
//         } else {
//             setTimeout(() => {
//                 startImapConnection();
//             }, 30 * 1000);
//         }
//     };

//     startImapConnection();
// }