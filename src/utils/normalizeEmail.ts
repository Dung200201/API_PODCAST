// utils/normalizeEmail.ts

/**
 * Chuẩn hóa địa chỉ email để xử lý các trường hợp đặc biệt của Gmail.
 * - Chuyển tất cả thành chữ thường.
 * - Loại bỏ các alias (phần sau dấu '+').
 * - Đối với tên miền Gmail, loại bỏ tất cả dấu chấm '.' trong phần username.
 * @param email - Địa chỉ email đầu vào.
 * @returns Địa chỉ email đã được chuẩn hóa.
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  const emailTrimmed = email.trim().toLowerCase();
  const parts = emailTrimmed.split('@');

  if (parts.length !== 2) {
    // Không phải là email hợp lệ, trả về nguyên bản đã lowercase
    return emailTrimmed;
  }

  let [username, domain] = parts;

  // 1. Xử lý alias dấu cộng (+) cho tất cả các domain
  const plusIndex = username.indexOf('+');
  if (plusIndex !== -1) {
    username = username.substring(0, plusIndex);
  }

  // 2. Xử lý dấu chấm (.) đặc biệt cho các domain của Google
  const googleDomains = ['gmail.com', 'googlemail.com'];
  if (googleDomains.includes(domain)) {
    username = username.replace(/\./g, '');
  }

  return `${username}@${domain}`;
}