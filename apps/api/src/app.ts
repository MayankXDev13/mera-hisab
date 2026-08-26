import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import healthRouter from "./routes/health.routes.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import accountsRouter from "./routes/accounts.routes.js";
import cardsRouter from "./routes/cards.routes.js";
import customersRouter from "./routes/customers.routes.js";
import transactionsRouter from "./routes/transactions.routes.js";
import { openApiSpec } from "./docs/openapi.js";
import { httpLogger } from "./lib/logger.js";

export const createApp = () => {
  const app = express();

  app.use(httpLogger);
  app.use(
    cors({
      origin: process.env.WEB_URL ?? "http://localhost:3000",
      credentials: true,
    }),
  );
  app.use(express.json());

  app.use("/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api", userRouter);
  app.use("/api/accounts", accountsRouter);
  app.use("/api/cards", cardsRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/transactions", transactionsRouter);

  app.get("/api/openapi.json", (_req, res) => res.json(openApiSpec));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));

  app.get("/", (_req, res) => {
    res.json({ ok: true, service: "api" });
  });

  return app;
};

export default createApp;
