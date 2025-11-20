import _ from "lodash";

export async function generateUniqueOrderCode(prisma: any): Promise<string> {
  let orderCode = ""; // ✅ Khởi tạo trước để tránh lỗi TS
  let exists = true;

  while (exists) {
    const randomCode = _.sampleSize("0123456789", 6).join("").padStart(6, "0");
    orderCode = `LP ${randomCode}`;

    const existingOrder = await prisma.deposit.findUnique({
      where: { order_code: orderCode },
    });

    exists = !!existingOrder;
  }

  return orderCode;
}