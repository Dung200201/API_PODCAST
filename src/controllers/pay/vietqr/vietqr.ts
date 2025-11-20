import { VietQR } from "vietqr";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import dotenv from "dotenv";
dotenv.config();

const QRCODE_BANK = process.env.QRCODE_BANK!;
const QRCODE_ACCOUNTNAME_BANK = process.env.QRCODE_ACCOUNTNAME_BANK!;
const QRCODE_ACCCOUNTNUMBER_BANK = process.env.QRCODE_ACCCOUNTNUMBER_BANK!;
const VIETQR_CLIENT_ID = process.env.VIETQR_CLIENT_ID!;
const VIETQR_API_KEY = process.env.VIETQR_API_KEY!;

const vietQR = new VietQR({
  clientID: VIETQR_CLIENT_ID,
  apiKey: VIETQR_API_KEY,
});

// ✅ Hàm lấy danh sách ngân hàng
export const getBanks = async (
  fastify: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const banks = await vietQR.getBanks();
    reply.send({ message: banks.desc, data: banks.data });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách ngân hàng:", error);
  }
}

// ✅ Hàm tạo mã QR thanh toán
export const createVietQR = async (
  fastify: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const { depositId, amount, memo, coupon_code } = req.body as any;

    if (!depositId) {
      return reply.status(400).send({
        message: "DepositId is required.",
        success: false,
      });
    }

    // Tìm deposit trong cơ sở dữ liệu theo id
    const [depositDetail, credit] = await Promise.all([
      fastify.prisma.deposit.findUnique({
        where: { id: depositId },
        select: {
          package: {
            select: {
              name: true,
              price_vnd: true,
              points: true,
            },
          },
        },
      }),
      fastify.prisma.credit.findFirst({
        where: { name: "qrcode", deletedAt: null },
        select: {
          id: true,
        },
      }),
    ]);
    // Nếu không tìm thấy, trả về thông báo lỗi
    if (!depositDetail) {
      return reply.status(404).send({
        message: "Deposit not found with the provided ID.",
        success: false,
      });
    }

    if (coupon_code) {
      const couponCode = await fastify.prisma.coupon.findUnique({
        where: { code: coupon_code, deletedAt: null, isActive: true },
        select: {
          id: true,
          expiresAt: true,
          maxRedemptions: true,
          code: true,
          couponValue: true,
          couponType: true,
        }
      });

      if (!couponCode) {
        return reply.status(404).send({
          message: "Coupon code does not exist or has expired",
          success: false,
        });
      }

      // cehck xem dã hết hạn chưa
      if (couponCode.expiresAt && couponCode.expiresAt < new Date()) {
        return reply.status(400).send({
          message: "Coupon code has expired",
          success: false,
        });
      }

      // check xem còn số laafn sử dụng k
      if (couponCode.maxRedemptions === 0) {
        return reply.status(404).send({
          message: "Coupon code has expired",
          success: false,
        });
      }

      // ✅ Sử dụng generateQR
      const { qrCode, qrDataURL, desc } = await generateQR({ amount, memo });

      await fastify.prisma.deposit.update({
        where: { id: depositId }, // Xác định gói cần cập nhật dựa trên ID
        data: {
          status: "pending",
          coupon: couponCode ? { connect: { id: couponCode.id } } : undefined,
          currency: "vnd",
          money_vnd: amount,
          credit: { connect: { id: credit?.id } },
          package_name: depositDetail?.package?.name,
          package_points: depositDetail?.package?.points,
          package_price: depositDetail?.package?.price_vnd,
          coupon_code: couponCode?.code,
          coupon_value: couponCode?.couponValue,
          coupon_type: couponCode?.couponType,
        },
        select: {
          id: true,
        }
      });

      return reply.send({
        success: true,
        message: desc,
        qrCode,
        qrDataURL,
      });
    }

    // ✅ Sử dụng generateQR
    const { qrCode, qrDataURL, desc } = await generateQR({ amount, memo });

    await fastify.prisma.deposit.update({
      where: { id: depositId }, // Xác định gói cần cập nhật dựa trên ID
      data: {
        status: "pending", // Kiểm tra xem "PENDING" có phải là một giá trị hợp lệ trong DepositStatus không
        currency: "vnd",
        money_vnd: amount,
        credit: { connect: { id: credit?.id } },
        package_name: depositDetail?.package?.name,
        package_points: depositDetail?.package?.points,
        package_price: depositDetail?.package?.price_vnd,
      },
      select: {
        id: true,
      }
    });

    return reply.send({
      success: true,
      message: desc,
      qrCode,
      qrDataURL,
    });
  } catch (error) {
    console.error("Lỗi khi tạo mã QR:", error);
  }
}

// ✅ Tách riêng hàm generateQR để tái sử dụng
async function generateQR({
  amount,
  memo,
  template = "compact",
}: {
  amount: number;
  memo: string;
  template?: "compact" | "print"; // Hoặc các template VietQR hỗ trợ
}) {
  if (!amount || typeof amount !== "number") {
    throw new Error("Amount must be a number and is required.");
  }

  console.log("QRCODE_ACCOUNTNAME_BANK", QRCODE_ACCOUNTNAME_BANK);
  console.log("QRCODE_BANK", QRCODE_BANK);
  console.log("QRCODE_ACCCOUNTNUMBER_BANK", QRCODE_ACCCOUNTNUMBER_BANK);
  

  const response = await vietQR.genQRCodeBase64({
    bank: QRCODE_BANK,
    accountName: QRCODE_ACCOUNTNAME_BANK,
    accountNumber: QRCODE_ACCCOUNTNUMBER_BANK,
    amount,
    memo,
    template,
  });

  const { qrDataURL, qrCode } = response.data.data;

  return {
    qrCode,
    qrDataURL,
    desc: response.data.desc,
  };
}
