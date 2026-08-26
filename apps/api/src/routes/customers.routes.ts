import { Router } from "express";
import { createCustomerSchema, updateCustomerSchema, createRepaymentSchema } from "@repo/schemas";
import { validateBody } from "@repo/schemas";
import { requireSession } from "../middlewares/auth.js";
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  getOutstanding,
  getOutstandingBatch,
  createRepaymentHandler,
} from "../controllers/customers.controller.js";

const router = Router();

router.use(requireSession);
router.get("/outstanding", getOutstandingBatch);
router.get("/", listCustomers);
// repayment: one credit transaction + allocations, atomically
router.post("/:id/repayments", validateBody(createRepaymentSchema), createRepaymentHandler);
router.get("/:id", getCustomer);
router.get("/:id/outstanding", getOutstanding);
router.post("/", validateBody(createCustomerSchema), createCustomer);
router.patch("/:id", validateBody(updateCustomerSchema), updateCustomer);

export default router;
