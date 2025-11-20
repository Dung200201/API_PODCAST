import axios from 'axios';
import crypto from 'crypto';
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import dotenv from "dotenv";
dotenv.config();

const PARTNER_CODE = process.env.PAY2S_PARTNER_CODE!;
const ACCESS_KEY = process.env.PAY2S_ACCESS_KEY!;
const SECRET_KEY = process.env.PAY2S_SECRET_KEY!;

const PAY2S_API_URL = process.env.PAY2S_API_URL!; // API URL của Pay2S

// Hàm tạo chữ ký (signature)s để bảo mật request
const createSignature = (params: any): string => {
    const dataString = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
    return crypto.createHmac('sha256', SECRET_KEY).update(dataString).digest('hex');
};

// Gửi yêu cầu tạo thanh toán QR Code
export const createPayment = async (
    fastify: FastifyInstance,
    req: FastifyRequest,
    reply: FastifyReply
) => {
    const { orderId, amount, description } = req.body as any;
    const requestData:any = {
        partner_code: PARTNER_CODE,
        access_key: ACCESS_KEY,
        order_id: orderId,
        amount: amount,
        description: description,
        timestamp: Date.now(),
    };

    requestData['signature'] = createSignature(requestData);

    try {
        const response = await axios.post(`${PAY2S_API_URL}/payment/create`, requestData);
        return response.data;
    } catch (error) {
        console.error('Error creating payment:', error);
        throw error;
    }
};

// Kiểm tra trạng thái giao dịch
export const checkTransactionStatus = async (
    fastify: FastifyInstance,
    req: FastifyRequest,
    reply: FastifyReply
) => {
    const { orderId } = req.params as any;
    const requestData:any = {
        partner_code: PARTNER_CODE,
        access_key: ACCESS_KEY,
        order_id: orderId,
        timestamp: Date.now(),
    };

    requestData['signature'] = createSignature(requestData);

    try {
        const response = await axios.post(`${PAY2S_API_URL}/payment/status`, requestData);
        return response.data;
    } catch (error) {
        console.error('Error checking transaction:', error);
        throw error;
    }
};
