import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

const BCRYPT_SALT_ROUNDS = 10;

export function generateMqttCredentials(): {
  username: string;
  password: string;
} {
  const shortId = randomUUID().replace(/-/g, "").slice(0, 12);
  const password = randomBytes(32).toString("base64url");
  return {
    username: `dev_${shortId}`,
    password,
  };
}

export async function hashMqttPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function verifyMqttPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
