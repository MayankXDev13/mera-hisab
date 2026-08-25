import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import * as ctrl from "../controllers/exports.controller.js";

export const exportsRouter = Router();
exportsRouter.use(requireAuth);
exportsRouter.get("/transactions.csv", ctrl.exportTransactionsCsv);
exportsRouter.get("/customers.csv", ctrl.exportCustomersCsv);
exportsRouter.get("/charges.csv", ctrl.exportChargesCsv);
exportsRouter.get("/statement/:customerId.pdf", ctrl.exportStatementPdf);
