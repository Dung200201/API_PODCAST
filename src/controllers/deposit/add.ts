import { FastifyInstance, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../utils/handleError";
import { CeateOrderSchemasInput, createOrderSchemas } from "../../schema/deposit";
import _ from 'lodash';
import dotenv from "dotenv";
dotenv.config();
import { v7 as uuidv7 } from 'uuid';
import { generateUniqueOrderCode } from "../../utils/randomCodeDeposit";

export const createDeposit = async (
  fastify: FastifyInstance,
  request: any,
  reply: FastifyReply
) => {
  try {
       const { id: userId, isVN } = request.user as { id: string; role: string; isVN: boolean };
    const formData: any = request.body;
    const { packageId, coupon_code, quantity, currency }: any = formData as CeateOrderSchemasInput;

    // Validate request body
    const checkValidate: any = createOrderSchemas.safeParse(formData);

    if (!checkValidate.success) {
      const allErrors = checkValidate.error.errors.map((err: any) => err.message).join(', ');
      return reply.status(400).send({
        message: allErrors,
      });
    }

    // =================== Promise chạy song song kiểm tra lấy dữ liệu
    const [userExists, pendingDeposit, packageDetail, couponData]: any = await Promise.all([
      fastify.prisma.user.findUnique({ where: { id: userId } }),
      fastify.prisma.deposit.findFirst({
        where: { userId: userId, status: { in: ["new", "pending"] } },
        select: {
          id: true,
          order_code: true,
          status: true,
          package: {
            select: {
              price_usd: true,
              price_vnd: true,
              points: true,
              type: true
            }
          }, // Trả về thông tin user
          coupon: {
            select: {
              id: true
            }
          },
        }
      }),
      fastify.prisma.packages.findUnique({ where: { id: packageId } }),
      coupon_code
        ? fastify.prisma.coupon.findUnique({ where: { code: coupon_code } })
        : null,
    ]);

    // ============ Kiểm tra điều kiện 
    // check user
    if (!userExists) {
      return reply.status(400).send({
        message: "User not found. Please provide a valid userId.",
        success: false,
      });
    }

    //   check bảng packages(bảng gói điểm)
    if (!packageDetail) {
      return reply.status(404).send({
        message: "Package not found with the provided code.",
        success: false,
        statusCode: 409,
        field: "coupon",
      });
    }

    // check coupon
    if (coupon_code) {

      const validPackageTypes = ['mini', 'small', 'huge'];

      if (coupon_code !== "TRIAN20" && !validPackageTypes.includes(pendingDeposit.package.type)) {
        return reply.status(409).send({
          message: "The coupon code isn't valid for this plan",
          statusCode: 409,
          field: "coupon",
        });
      }

      if (!couponData) {
        return reply.status(404).send({
          message: "Coupon code does not exist or has expired",
          success: false,
          statusCode: 409,
          field: "coupon",
        });
      }

      // cehck xem dã hết hạn chưa
      if (couponData.expiresAt && couponData.expiresAt < new Date()) {
        return reply.status(400).send({
          message: "Coupon code has expired",
          success: false,
          statusCode: 409,
          field: "coupon",
        });
      }

      // check xem còn số laafn sử dụng k
      if (couponData.maxRedemptions === 0) {
        return reply.status(404).send({
          message: "Coupon code has expired",
          success: false,
          statusCode: 409,
          field: "coupon",
        });
      }
    }

    //================ Kiểm tra ngôn ngữ
    let languageData =request.headers["accept-language"].startsWith("vi") ? "vi" : "en";
   const isVietnamese = languageData === "vi" || isVN;

    // Hiển thị tiền tệ tuỳ theo ngôn ngữ
    const packagePrice = isVietnamese ? currency === "usd" ? packageDetail.price_usd : packageDetail.price_vnd : packageDetail.price_usd;

    // Tính toán subtotal và total
    let subtotal;
    let total;
    let couponValue;

    // Người dùng chưa tạo đơn hàng nào 
    if (!pendingDeposit) {
      const uniqueOrderCode = await generateUniqueOrderCode(fastify.prisma);

      const dataReq = {
        id: uuidv7(),
        user: {
          connect: { id: userExists.id },
        },
        package: {
          connect: { id: packageDetail.id },
        },
        quantity: quantity,
        status: "new", // Kiểm tra xem "PENDING" có phải là một giá trị hợp lệ trong DepositStatus không
        order_code: uniqueOrderCode,
        coupon: couponData ? { connect: { id: couponData.id } } : undefined,
      };

      const newData = await fastify.prisma.$transaction(async (prisma: any) => {
        const data = await prisma.deposit.create({
          data: dataReq,
          select: {
            id: true,
            order_code: true,
            status: true,
            package: {
              select: {
                price_usd: true,
                price_vnd: true,
                points: true
              }
            }, // Trả về thông tin user
            coupon: {
              select: {
                id: true
              }
            },
          }
        });
        return data;
      });

      subtotal = packagePrice * quantity;
      couponValue = calculateCouponDiscount({
        coupon: couponData,
        subtotal,
      });
      total = couponData ? Math.max(0, subtotal - couponValue) : subtotal;

      return reply.status(200).send({
        message: "Created order successfully!",
        pttt: isVietnamese ? [{ name: "qrcode" }, { name: "paypal" }] : [{ name: "paypal" }],
        success: true,
        deposit: {
          ...newData,
          subtotal,
          status: "new",
          total,
          packageId: packageId
        }
      });
    } else {
      const dataReq: any = {
        user: {
          connect: { id: userExists.id },
        },
        package: {
          connect: { id: packageDetail.id },
        },
        coupon: {
          disconnect: true,
        },
        quantity: quantity,
        status: "new",
        currency: "vnd",
        money_vnd: null,
        package_name: null,
        package_points: null,
        package_price: null,
        coupon_code: null,
        coupon_value: null,
        coupon_type: null,
      }

      //form add
      const updatedDeposit: any = await fastify.prisma.deposit.update({
        where: { id: pendingDeposit.id }, // Xác định gói cần cập nhật dựa trên ID
        data: dataReq,
        select: {
          id: true,
          order_code: true,
          status: true,
          package: {
            select: {
              price_usd: true,
              price_vnd: true,
              points: true
            }
          }, // Trả về thông tin user
          coupon: {
            select: {
              id: true
            }
          },
        }
      });

      subtotal = packagePrice * quantity;
      couponValue = calculateCouponDiscount({
        coupon: couponData,
        subtotal,
      });
      total = couponData ? Math.max(0, subtotal - couponValue) : subtotal;

      return reply.status(200).send({
        message: "Update order successfully!",
        pttt: isVietnamese ? [{ name: "qrcode" }, { name: "paypal" }] : [{ name: "paypal" }],
        success: true,
        deposit: {
          ...updatedDeposit,
          package: isVietnamese ? updatedDeposit.package : undefined,
          points: updatedDeposit.package.points,
          subtotal,
          total,
          packageId: packageId,
          couponValue
        }
      });
    }
  } catch (error) {
    handleErrorResponse(reply, error);
  }
};

function calculateCouponDiscount({
  coupon,
  subtotal
}: {
  coupon?: any,
  subtotal: number
}): number {
  if (!coupon) return 0;

  const type = coupon.couponType;
  const value = coupon.couponValue;

  if (type === "discount") {
    return Math.floor((subtotal * value) / 100); // Giảm phần trăm
  }

  return value; // Nếu là giảm cố định (amount)
}


