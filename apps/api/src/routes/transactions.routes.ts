import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import { validateBody, validateQuery } from "../lib/validate.js";
import { createTransactionSchema, transactionFilterQuerySchema } from "@repo/shared";
import * as ctrl from "../controllers/transactions.controller.js";

export const transactionsRouter = Router();
transactionsRouter.use(requireAuth);
transactionsRouter.get("/", validateQuery(transactionFilterQuerySchema), ctrl.listTransactions);
transactionsRouter.post("/", validateBody(createTransactionSchema), ctrl.createTransaction);
transactionsRouter.post("/:id/reverse", ctrl.reverseTransaction);
