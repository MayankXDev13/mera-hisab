import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import * as ctrl from "../controllers/transactions.controller.js";

export const transactionsRouter = Router();
transactionsRouter.use(requireAuth);
transactionsRouter.get("/", ctrl.listTransactions);
transactionsRouter.post("/", ctrl.createTransaction);
transactionsRouter.post("/:id/reverse", ctrl.reverseTransaction);
