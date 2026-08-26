import { Router } from "express";
import { createTransactionSchema, transactionFilterQuerySchema } from "@repo/schemas";
import { validateBody, validateQuery } from "@repo/schemas";
import { requireSession } from "../middlewares/auth.js";
import { createTransaction, listTransactions, reverseTransaction } from "../controllers/transactions.controller.js";

const router = Router();

router.use(requireSession);
router.get("/", validateQuery(transactionFilterQuerySchema), listTransactions);
router.post("/", validateBody(createTransactionSchema), createTransaction);
router.post("/:id/reverse", reverseTransaction);

export default router;
