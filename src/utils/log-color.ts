export const green = (text: string) => `\x1b[32m${text}\x1b[0m`; // ✅
export const red = (text: string) => `\x1b[31m${text}\x1b[0m`;   // ❌
export const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`; // ⚠️
export const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;   // 🛠️