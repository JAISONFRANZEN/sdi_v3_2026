import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { verifyToken, type AuthPayload } from "./auth";

export function createContext({ req }: CreateExpressContextOptions) {
  const authHeader = req.headers.authorization;
  let user: AuthPayload | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    user = verifyToken(authHeader.slice("Bearer ".length));
  }
  return { user };
}

export type Context = ReturnType<typeof createContext>;
