import Imap from 'node-imap';
import { imapConfig } from '../config/imap_config';

interface VerifyResult {
    success: boolean;
    message: string;
    error?: string;
}

export const verifyEmail = (Email: string, appPassword: string): Promise<VerifyResult> => {
    return new Promise((resolve, reject) => {
        let timeoutHandler: NodeJS.Timeout | null = null;

        const imap = new Imap({
            user: Email,
            password: appPassword,
            ...imapConfig
        });

        const cleanup = () => {
            if (timeoutHandler) {
                clearTimeout(timeoutHandler);
                timeoutHandler = null;
            }
            if (imap.state !== 'disconnected') {
                imap.end(); // Đảm bảo đóng kết nối đúng cách
            }
        };

        const onError = (err: Error) => {
            cleanup();
            reject({
                success: false,
                message: 'Invalid app password or an error occurred.',
                error: err.message || 'Unknown error'
            });
        };

        imap.once('ready', () => {
            // Mở hộp thư để kiểm tra quyền truy cập thực sự
            imap.openBox('INBOX', false, (err, box) => {
                if (err) {
                    onError(err);
                } else {
                    cleanup();
                    resolve({
                        success: true,
                        message: 'App password is valid. Access to INBOX confirmed.'
                    });
                }
            });
        });

        imap.once('error', onError);
        imap.once('end', () => console.log('IMAP connection ended'));

        try {
            imap.connect();
        } catch (err) {
            onError(err as Error);
        }

        timeoutHandler = setTimeout(() => {
            onError(new Error('Connection timed out'));
        }, 7000); // Tăng timeout để tránh false negative do phản hồi chậm
    });
};
