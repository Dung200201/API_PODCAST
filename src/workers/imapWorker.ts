// import { ImapFlow } from 'imapflow';
// import { simpleParser } from 'mailparser';
// import { saveEmailsToDatabase } from '../controllers/mails/add';

// const client = new ImapFlow({
//     host: 'imap.gmail.com',
//     port: 993,
//     secure: true,
//     auth: {
//         // user: process.env.EMAIL_TRANSACTION,
//         // pass: process.env.APP_PASSWORD_TRANSACTION,
//         user: "daominhngoc.tm@gmail.com",
//         pass: "klsi bnbq qfpc dkrd",
//     },
// });

// async function main() {
//     await client.connect();
//     await client.mailboxOpen('INBOX');

//     console.log('📬 Đang chờ email mới...');

//     client.on('exists', async () => {
//         console.log('📩 Có email mới!');

//         const emailsToSave: any[] = [];
//         const uidsToMarkSeen: number[] = [];

//         try {
//             // Lấy danh sách UID chưa đọc, sắp xếp theo mới nhất
//             const searchResults = await client.search(
//                 // { seen: false, subject: ["SUBJECT", "SHB - Giao dich tai khoan"], from: 'scapbot.com@gmail.com' },
//                 {
//                     seen: false,
//                     since: new Date('2025-05-01'),      // Từ ngày 1/5/2025 trở đi
//                     before: new Date('2025-05-10'),
//                 },
//                 { uid: true }
//             );
//             const last20UIDs = searchResults.slice(-20); // lấy tối đa 20 UID cuối cùng
//             console.log("last20UIDs", last20UIDs);
            
//             if (last20UIDs.length === 0) return;

//             for await (const msg of client.fetch(last20UIDs, {
//                 // envelope: true,
//                 // uid: true,
//                 // seen: false,
//                 // source: true,
//             })) {
//                 console.log("msg", msg);
                
//                 const parsed: any = await simpleParser(msg.source);
//                 console.log("parsed", parsed);

//                 // const content = parsed.text || parsed.html || '';

//                 // if (content.includes('So tien: +')) continue;

//                 const emailData = {
//                     uid: msg.uid,
//                     messageId: parsed.messageId,
//                     from: parsed.from?.text || '',
//                     to: parsed.to?.text || '',
//                     subject: parsed.subject || '',
//                     date: parsed.date || new Date(),
//                     text: parsed.text || '',
//                     html: parsed.html || '',
//                 };
//                 console.log(1);

//                 emailsToSave.push(emailData);
//                 uidsToMarkSeen.push(msg.uid);
//             }
//             console.log('📥 Tổng email cần lưu:', emailsToSave.length);

//             // if (emailsToSave.length > 0) {
//             //     const result = await saveEmailsToDatabase(emailsToSave);
//             //     console.log('✅ Đã lưu vào DB:', result);

//             //     // Đánh dấu đã đọc
//             //     for (const uid of uidsToMarkSeen) {
//             //         await client.addFlags(uid, '\\Seen');
//             //         console.log(`📬 Đã đánh dấu email UID ${uid} là đã đọc.`);
//             //     }
//             // }
//         } catch (err) {
//             console.error('❌ Lỗi xử lý email:', err);
//         }
//     });
// }

// main().catch(console.error);