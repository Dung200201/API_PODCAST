import { prisma } from "../../plugins/prismaPlugin";
import { v7 as uuidv7 } from 'uuid';

export const saveEmailsToDatabase = async (emails: any[]) => {
  if (!emails.length) return;

  try {
    const emailData = emails.map(async (email) => {
      const { amount, contentPayment, receivedAt, lpCode } = extractData(
        email.text || ""
      );

      if (contentPayment) {
        await updateDepositStatus(lpCode as string, amount as number); // Gọi hàm cập nhật status
      }

      return {
        statement: contentPayment,
        amount: amount || 0,
        time_pay: receivedAt,
        id: uuidv7(),
        messageId: email.messageId
      };
    });

    const resolvedEmailData: any = await Promise.all(emailData);
    console.log("resolvedEmailData", resolvedEmailData);
    
    const data = await prisma.mails.createMany({
      data: resolvedEmailData,
      skipDuplicates: true,
    });

    console.log(`📥 Đã lưu ${data.count} email vào database!`);
  } catch (dbError) {
    console.error("❌ Lỗi khi lưu email vào database:", dbError);
  }
};

const extractData = (content = "") => {
  if (typeof content !== "string" || !content.trim()) {
    return { recipient: "", money: 0, contentCode: "", code: "" };
  }

  // Trích xuất số tiền
  const amountMatch = content.match(/So tien:\s*[+\-]?([\d,.]+)/i);
  const amount = amountMatch
    ? parseInt(amountMatch[1].replace(/,/g, ""), 10)
    : 0;

  let contentPayment = null;
  const contentMatch = content.match(/- Dien giai:\s*([^\n]+)/); // Lấy nội dung sau " - Dien giai:" đến xuống dòng
  if (contentMatch) {
    contentPayment = contentMatch[1].trim();
  }

  // Trích xuất mã có định dạng "LP xxxxxx"
  let lpCode = null;
  const lpCodeMatch = content.match(/\bLP\s\d{6}\b/); // Tìm chuỗi bắt đầu bằng LP và theo sau là 6 chữ số
  if (lpCodeMatch) {
    lpCode = lpCodeMatch[0]; // Lấy giá trị đầy đủ
  }

  let receivedAt = null;
  const dateMatch = content.match(
    /den thoi diem (\d{2}:\d{2}:\d{2}) ngay (\d{2})\/(\d{2})\/(\d{4})/
  );
  if (dateMatch) {
    const [_, time, day, month, year] = dateMatch;
    receivedAt = new Date(`${year}-${month}-${day}T${time}`);
  }

  return { amount, contentPayment, receivedAt, lpCode };
};

export const updateDepositStatus = async (lpCode: string, amount: number) => {
  if (!lpCode || !amount) return;

  try {
    // Gộp truy vấn để lấy packageId, creditId và thông tin package
    const depositInfo: any = await prisma.deposit.findFirst({
      where: { order_code: lpCode, status: {in: ["new","pending"]} },
      select: {
        id: true,
        userId: true,
        packageId: true,
        creditId: true,
        package: {
          select: { name: true, price_vnd: true, points: true },
        },
      },
    });

    if (!depositInfo || !depositInfo.packageId) {
      console.log(`⚠️ Không tìm thấy deposit hợp lệ với order_code: ${lpCode}`);
      return;
    }

    // Convert `Decimal` sang `number`
    const packagePrice = Number(depositInfo?.package?.price_vnd || 0);
    const packagePoints = Number(depositInfo?.package?.points || 0);

    // Xác định trạng thái đơn hàng
    let status: any = amount >= packagePrice && "completed";

    if (amount < packagePrice) {
      return;
    } else {
      // Kiểm tra creditId, nếu chưa có thì tìm hoặc tạo mới
      const credit = await prisma.credit.upsert({
        where: { name: "qrcode" },
        update: {},
        create: { name: "qrcode" },
        select: { id: true },
      });

      const creditId = credit.id;

      // Chạy transaction để đảm bảo tính nhất quán dữ liệu
      await prisma.$transaction(async (prisma) => {
        // Cập nhật deposit với số tiền thực tế nhận được
        const updatedDeposit = await prisma.deposit.updateMany({
          where: { order_code: lpCode, status: { not: "completed" } },
          data: {
            status: status, // Chỉ chuyển "COMPLETED" nếu số tiền đủ
            package_name: depositInfo.package.name,
            package_price: packagePrice,
            package_points: packagePoints,
            creditId,
            // Lưu số tiền khách đã chuyển
          },
        });

        if (updatedDeposit.count > 0) {
          console.log(
            `✅ Cập nhật ${updatedDeposit.count} bản ghi deposit thành trạng thái ${status}.`
          );
        } else {
          console.log(`⚠️ Không có deposit nào cần cập nhật.`);
          return;
        }

        // Ghi nhận transaction với số tiền thực tế khách chuyển
        await prisma.transaction.create({
          data: {
            id: uuidv7(),
            userId: depositInfo.userId,
            type: "credit",
            service: "qrcode",
            depositId: depositInfo.id,
            description: `You paid ${amount} VND for the ${packagePoints} points package through QRCODE`,
            points: packagePoints,
            status: true,
          },
        });

        console.log(
          `✅ Đã tạo transaction cho userId: ${depositInfo.userId} với số tiền ${amount} VND.`
        );
      });
    }
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật deposit:", error);
  }
};
