import { Router } from "express";
import { createCustomerSchema, updateCustomerSchema, createRepaymentSchema } from "@repo/schemas";
import { validateBody } from "@repo/schemas";
import { requireSession } from "../middlewares/auth.js";
import { createCustomersController } from "../controllers/customers.controller.js";
import { asyncHandler } from "../lib/http/asyncHandler.js";
import "../lib/http/types.js";

export const createCustomersRoutes = (controller = createCustomersController()) => {
  const router = Router();
  router.use(requireSession);
  router.get("/outstanding", asyncHandler(controller.getOutstandingBatch));
  router.get("/", asyncHandler(controller.listCustomers));
  // repayment: one credit transaction + allocations, atomically
  router.post("/:id/repayments", validateBody(createRepaymentSchema), asyncHandler(controller.createRepayment));
  router.get("/:id", asyncHandler(controller.getCustomer));
  router.get("/:id/outstanding", asyncHandler(controller.getOutstanding));
  router.post("/", validateBody(createCustomerSchema), asyncHandler(controller.createCustomer));
  router.patch("/:id", validateBody(updateCustomerSchema), asyncHandler(controller.updateCustomer));
  return router;
};

export default createCustomersRoutes();
