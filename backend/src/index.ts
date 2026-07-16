import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./context";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

if (process.env.NODE_ENV === "production") {
  // __dirname at runtime is backend/dist/src (tsc mirrors rootDir "."),
  // so it takes three levels up to reach the app root.
  const frontendDist = path.join(__dirname, "../../../frontend/dist");
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Backend rodando na porta ${port}`);
});
