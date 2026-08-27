import "./lib/http/types.js";
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
import { errorHandler } from "./lib/http/errorMiddleware.js";
import { db } from "@repo/db";
import { createAccountsController } from "./controllers/accounts.controller.js";
import { createCardsController } from "./controllers/cards.controller.js";
import { createCustomersController } from "./controllers/customers.controller.js";
import { createTransactionsController } from "./controllers/transactions.controller.js";
import { createAccountsRoutes } from "./routes/accounts.routes.js";
import { createCardsRoutes } from "./routes/cards.routes.js";
import { createCustomersRoutes } from "./routes/customers.routes.js";
import { createTransactionsRoutes } from "./routes/transactions.routes.js";

export type AppDeps = {
  db?: typeof db;
};

export const createApp = (deps: AppDeps = {}) => {
  const appDb = deps.db ?? db;

  // composition: function controllers with injected db (pglite in tests)
  const accountsController = createAccountsController(appDb);
  const cardsController = createCardsController(appDb);
  const customersController = createCustomersController(appDb);
  const transactionsController = createTransactionsController(appDb);

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

  // injected routers when deps provided, fallback to default routers for prod
  if (deps.db) {
    app.use("/api/accounts", createAccountsRoutes(accountsController));
    app.use("/api/cards", createCardsRoutes(cardsController));
    app.use("/api/customers", createCustomersRoutes(customersController));
    app.use("/api/transactions", createTransactionsRoutes(transactionsController));
  } else {
    app.use("/api/accounts", accountsRouter);
    app.use("/api/cards", cardsRouter);
    app.use("/api/customers", customersRouter);
    app.use("/api/transactions", transactionsRouter);
  }

  app.get("/api/openapi.json", (_req, res) => res.json(openApiSpec));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));

  app.get("/", (_req, res) => {
    res.json({ ok: true, service: "api" });
  });

  // central error handler — single JSON contract (auth-service pattern)
  app.use(errorHandler);

  return app;
};

export default createApp;
