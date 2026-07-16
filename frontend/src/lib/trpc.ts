import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../backend/src/routers";

export const trpc = createTRPCReact<AppRouter>();

const API_URL = import.meta.env.VITE_API_URL || "/api/trpc";

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: API_URL,
        headers() {
          const token = localStorage.getItem("auth_token");
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
