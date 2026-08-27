import { Router } from "express";
import { createTransactionSchema, transactionFilterQuerySchema } from "@repo/schemas";
import { validateBody, validateQuery } from "@repo/schemas";
import { requireSession } from "../middlewares/auth.js";
import { createTransactionsController } from "../controllers/transactions.controller.js";
import { asyncHandler } from "../lib/http/asyncHandler.js";
import "../lib/http/types.js";

export const createTransactionsRoutes = (controller = createTransactionsController()) => {
  const router = Router();
  router.use(requireSession);
  router.get("/", validateQuery(transactionFilterQuerySchema), asyncHandler(controller.listTransactions));
  // debits only — repayments live at POST /api/customers/:id/repayments
  router.post("/", validateBody(createTransactionSchema), asyncHandler(controller.createTransaction));
  return router;
};

export default createTransactionsRoutes();
