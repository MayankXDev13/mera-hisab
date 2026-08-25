import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import cron from "node-cron";
import { authMiddleware } from "./lib/auth.js";
import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { accountsRouter } from "./routes/accounts.routes.js";
import { cardsRouter } from "./routes/cards.routes.js";
import { customersRouter } from "./routes/customers.routes.js";
import { transactionsRouter } from "./routes/transactions.routes.js";
import { chargesRouter } from "./routes/charges.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { auditRouter } from "./routes/audit.routes.js";
import { exportsRouter } from "./routes/exports.routes.js";
import { runMonthlyCharges } from "./lib/charges.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.WEB_URL ?? "http://localhost:3000", credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(authMiddleware);

  app.use("/api/v1", healthRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/accounts", accountsRouter);
  app.use("/api/v1/cards", cardsRouter);
  app.use("/api/v1/customers", customersRouter);
  app.use("/api/v1/transactions", transactionsRouter);
  app.use("/api/v1/charges", chargesRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1/audit", auditRouter);
  app.use("/api/v1/exports", exportsRouter);

  // error handler
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "internal" });
  });
  return app;
}

// cron at 00:05 IST on 1st => 00:05 Asia/Kolkata
if (process.env.NODE_ENV !== "test") {
  cron.schedule("5 0 1 * *", () => {
    console.log("[cron] running monthly charges");
    runMonthlyCharges({ actorId: null });
  }, { timezone: "Asia/Kolkata" });
}

const port = parseInt(process.env.API_PORT ?? "3002", 10);
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createApp();
  app.listen(port, () => console.log(`API listening on :${port}`));
}
