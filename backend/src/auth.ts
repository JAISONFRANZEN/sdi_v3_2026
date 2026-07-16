import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

export type Role = "admin" | "inspetor_mpsc" | "usuario_residencial";

export interface AuthPayload {
  userId: number;
  email: string;
  role: Role;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const derived = scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(hash, "hex");
  return storedBuf.length === derived.length && timingSafeEqual(storedBuf, derived);
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

// Regra de autorização por perfil, conforme documentado: inspetor_mpsc só
// escreve inspeções MPSC; usuario_residencial só escreve residenciais; admin acessa tudo.
export function canWriteProfile(role: Role, profileType: "residencial" | "mpsc"): boolean {
  if (role === "admin") return true;
  if (role === "inspetor_mpsc") return profileType === "mpsc";
  if (role === "usuario_residencial") return profileType === "residencial";
  return false;
}
