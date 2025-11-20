import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.NODE_ENCRYPTION_KEY!, 'base64'); // 32 bytes
const iv = Buffer.from(process.env.NODE_ENCRYPTION_IV!, 'base64');   // 12 bytes

export function encrypt(text: string) {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final()
    ]);
    const authTag = cipher.getAuthTag();
    return {
        ciphertext: encrypted.toString('hex'),
        tag: authTag.toString('hex')
    };
}

export function decrypt(ciphertext: string, tag: string) {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'hex')),
        decipher.final()
    ]);
    return decrypted.toString('utf8');
}
