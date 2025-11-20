import { randomBytes } from "crypto";

export function generateApiKey(length: number = 32): string {
  return randomBytes(length).toString("hex").slice(0, length);
}
