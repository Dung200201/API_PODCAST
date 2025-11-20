import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import QRCode from 'qrcode'

// Ví dụ: hardcode địa chỉ ví ban đầu (hoặc dùng file json / biến môi trường)
let wallets = {
    bep20: "0x12aD3C45E71f5431cEb4f1c7aF42dDe1f1E8888A",
    trc20: "TYSyF4M9c6DHFx2kqETh2MDM5nXgcsGcj5"
};

export const createQrcodeUSDT = async (
    fastify: FastifyInstance,
    req: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        const { amount, mode } = req.body as {
            amount: string,
            mode: 'bep20' | 'trc20'
        };

        if (!amount || !mode || !wallets[mode]) {
            return reply.status(400).send({
                success: false,
                message: "Thiếu thông tin hoặc mode không hợp lệ (bep20 / trc20)"
            });
        }

        const address = wallets[mode];

        // ⚠️ Format QR Code chuẩn theo TrustWallet/Binance/TronLink:
        // TRC20 dùng "tron:<address>?amount=123"
        // BEP20/ETH chuẩn EIP681: "ethereum:<address>?value=1230000000000000000" (wei)\

        let qrContent = '';
        if (mode === "trc20") {
            qrContent = `tron:${address}?amount=${amount}`;
        } else {
            // Với BEP20, bạn có thể dùng đơn vị USDT bình thường (chấp nhận sai chuẩn 1 tí, client vẫn scan được)
            qrContent = `${address}?amount=${amount}`;
        }

        const qrDataURL = await QRCode.toDataURL(qrContent);

        return reply.send({
            success: true,
            message: `Mã QR thanh toán USDT (${mode.toUpperCase()})`,
            address,
            qrContent,
            qrDataURL
        });
    } catch (error) {
        console.error("Lỗi khi tạo mã QR:", error);
        return reply.status(500).send({ success: false, message: "Lỗi server khi tạo mã QR" });
    }
}