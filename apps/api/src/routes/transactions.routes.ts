import { Router } from "express";
import { createTransactionSchema, transactionFilterQuerySchema } from "@repo/schemas";
import { validateBody, validateQuery } from "@repo/schemas";
import { requireSession } from "../middlewares/auth.js";
import { createTransaction, listTransactions } from "../controllers/transactions.controller.js";

const router = Router();

router.use(requireSession);
router.get("/", validateQuery(transactionFilterQuerySchema), listTransactions);
// debits only — repayments live at POST /api/customers/:id/repayments
router.post("/", validateBody(createTransactionSchema), createTransaction);

export default router;
