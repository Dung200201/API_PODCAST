import axios from "axios";
import dotenv from "dotenv";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { handleErrorResponse } from "../../../utils/handleError";
import _ from 'lodash';
dotenv.config();
import { v7 as uuidv7 } from 'uuid';
import { CeateOrderSchemasInput } from "../../../schema/deposit";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
const PAYPAL_API_URL = process.env.PAYPAL_API_URL!;
const WEBSITE_URL = process.env.WEBSITE_URL!;
const API_URL = process.env.API_URL!;

if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || !PAYPAL_API_URL) {
    throw new Error("Missing PayPal environment variables");
}

// Lấy token truy cập từ PayPal
async function generateAccessToken() {
    try {
        const response = await axios({
          url: PAYPAL_API_URL + "/v1/oauth2/token",
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          data: "grant_type=client_credentials",
          auth: {
            username: PAYPAL_CLIENT_ID,
            password: PAYPAL_CLIENT_SECRET,
          },
        });
        return response.data.access_token;
    } catch (error) {
        throw new Error("Failed to generate PayPal access token");
    }
}

// Tạo đơn hàng PayPal
export const createOrder = async (
    fastify: FastifyInstance,
    req: any,
    reply: FastifyReply
) => {
    try {
        const {id:userId} = req.user as { id: string };
        
        const formData: any = req.body
        const { depositId, coupon_code }:any = formData as CeateOrderSchemasInput;
        const package_currency_code =  "usd";  // Mã tiền tệ
        
        // lấy token
        const accessToken = await generateAccessToken();

        // Promise chạy song song
        const [userExists, checkDeposit, creditName, couponData]:any = await Promise.all([
            fastify.prisma.user.findUnique({ where: { id: userId } }),
            fastify.prisma.deposit.findFirst({
                where: { userId, id: depositId, status: "new" },
                include: { package: true }, // Kết hợp dữ liệu package trong cùng một truy vấn
            }),
            fastify.prisma.credit.findUnique({ where: { name: "paypal" } }),
            coupon_code ? fastify.prisma.coupon.findUnique({ where: { code: coupon_code }}) : null
        ]);

         // Kiểm tra dữ liệu thiếu
         if (!userExists || !checkDeposit || !checkDeposit.package) {
            return reply.status(400).send({
                message: "User, deposit, or package not found.",
                success: false,
            });
        }

        const packageDetail:any = await  fastify.prisma.packages.findFirst({ where: { id: checkDeposit.package.id } });

        // check bảng credit(bảng loại thanh toán)
        if (!creditName) {
            // Nếu không có code trong formData, tạo mã ngẫu nhiên duy nhất
            await fastify.prisma.$transaction(async (prisma: any) => {
            const data = await prisma.credit.create({
                data: {
                    id: uuidv7(),
                    user: {
                        connect: { id: userExists.id },
                    },
                    name: "paypal",
                    description: "Draft",
                },
            });
            return data;
            });
        }

        // Check if coupon exists and coupon_code is provided
        if (coupon_code && !couponData) {
            return reply.status(400).send({ error: "Coupon code is invalid or does not exist" });
        }

        // detructering dữ liệu
        const total_price = packageDetail.price_usd * checkDeposit.quantity;
        const total_order = total_price;

        // start 
        const orderData = {
            intent: "CAPTURE",  
            application_context: {
                return_url: `${API_URL}/api/pay/paypal/complete-order`,
                cancel_url: `${WEBSITE_URL}/billings/invoices`,
                shipping_preference: "NO_SHIPPING",
                user_action: "PAY_NOW",
                brand_name: "Likepion",
            },
            purchase_units: [
                {
                    reference_id: `OD${Date.now()}`,  // ID tham chiếu đơn hàng
                    custom_id: userExists.id,  // Lưu userId vào custom_id
                    amount: {
                        currency_code: "USD",
                        value: total_price,
                        breakdown: {
                            item_total: {
                                currency_code: package_currency_code,
                                value: total_order,
                            },
                        },
                    },
                    items: [
                        {
                            name: packageDetail.name,
                            description: packageDetail.description,
                            quantity: checkDeposit.quantity,
                            unit_amount: {
                                currency_code: package_currency_code,
                                value: packageDetail.price_usd,
                            },
                        },
                    ],
                },
            ],
        };

        const response = await axios.post(
            `${PAYPAL_API_URL}/v2/checkout/orders`,
            orderData,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const dataUpdate = {
            pay_order_id: response.data.id, 
        }

        await fastify.prisma.deposit.update({
            where: { id: checkDeposit.id },
            data: dataUpdate
        });
        

        const approvalUrl = response.data.links.find(
            (link: any) => link.rel === "approve"
        )?.href;

        if (!approvalUrl) {
            throw new Error("Approval URL not found");
        }

        reply.send({ success: true ,url: approvalUrl });
    } catch (error: any) {
        console.log(error);
        
        handleErrorResponse(reply, error); // Hàm xử lý lỗi
    }
};

// Xác nhận thanh toán
export const capturePayment = async (
    fastify: FastifyInstance,
    req: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        const { token } = req.query as { token: string };
        // const timeNow = new Date();

        if (!token) {
            return reply.status(400).send({ error: "Missing order token" });
        }

        const accessToken = await generateAccessToken();

        const response = await axios.post(
            `${PAYPAL_API_URL}/v2/checkout/orders/${token}/capture`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const [pendingDeposit, checkCredit]:any = await Promise.all([
            fastify.prisma.deposit.findFirst({
                where: { pay_order_id: response.data.id, status: "new" },
                include: {
                    coupon: true, // Tải thông tin coupon nếu có
                    package: true, // Tải thông tin coupon nếu có
                },
            }),
            fastify.prisma.credit.findUnique({ where: { name: "paypal" }, select: { id: true } }),
        ]);

        console.log(response.data);
        

        if (!pendingDeposit) {
            return reply.status(400).send({ error: "No pending deposit found" });
        }
        
        if (response.data.status !== "COMPLETED") {
            await fastify.prisma.deposit.update({
                where: { id: pendingDeposit.id },
                data: { status: "failed"}
            });
            return reply.status(400).send({ error: "Transaction not completed" });
        }

        const dataUpdate = {
            status: response.data.status.toLowerCase(), 
            payer_id: response.data.payer.payer_id,
            package_name: pendingDeposit?.package?.name,
            package_price: pendingDeposit?.package?.price_usd,
            money_vnd: pendingDeposit?.package?.price_vnd,
            package_points: pendingDeposit?.package?.points,
            coupon_code: pendingDeposit?.coupon?.code || null,  
            coupon_value: pendingDeposit?.coupon?.couponValue || null,
            coupon_type: pendingDeposit?.coupon?.couponType || null,
            credit: {
                connect: { id: checkCredit.id },
            },
        }
        
        const dataDeposit:any = await fastify.prisma.deposit.update({
            where: { id: pendingDeposit.id},
            data: dataUpdate,
             select: {
                id: true,
                userId: true,
                packageId: true,
                creditId: true,
                money_vnd: true,
                package: {
                    select: { name: true, price_vnd: true, points: true, durationDays: true },
                },
            },
        });

        if (dataDeposit) {
            await fastify.prisma.$transaction(async (prisma: any) => {
                const transaction = await prisma.transaction.create({
                    data: {
                        id: uuidv7(),
                        userId: dataDeposit.userId,
                        type: 'credit', 
                        service: 'paypal', 
                        depositId: dataDeposit.id,  
                        description: `You paid the ${pendingDeposit?.package?.points} points package for ${pendingDeposit?.package?.price_usd}$ through PAYPAL`, 
                        points: pendingDeposit?.package?.points, 
                        status: true,  
                    }
                });

                const now = new Date();
                const currentExpire = transaction.user?.expiresAt && transaction.user.expiresAt > now ? transaction.user.expiresAt : now;
                const extendedExpire = new Date(currentExpire);
                extendedExpire.setDate(extendedExpire.getDate() + (dataDeposit.package?.durationDays || 0));

                await prisma.user.update({
                    where: {
                        id:dataDeposit.userId
                    },
                    data: {
                        expiresAt: extendedExpire
                    },
                });

                return transaction;
            });
        }

        reply.redirect(`${process.env.WEBSITE_URL}/billings/transaction?status=success&message=Payment+Completed+Successfully`);
    } catch (error: any) {
        console.log(error);
        
        reply.status(500).send({ message: error.response?.data || error.message });
    }
};