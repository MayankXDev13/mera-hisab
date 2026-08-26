import { Router } from "express";
import { createCustomerSchema, updateCustomerSchema } from "@repo/schemas";
import { validateBody } from "../lib/validate.js";
import { requireSession } from "../middlewares/auth.js";
import { listCustomers, getCustomer, createCustomer, updateCustomer, getOutstanding } from "../controllers/customers.controller.js";

const router = Router();

router.use(requireSession);
router.get("/", listCustomers);
router.get("/:id", getCustomer);
router.get("/:id/outstanding", getOutstanding);
router.post("/", validateBody(createCustomerSchema), createCustomer);
router.patch("/:id", validateBody(updateCustomerSchema), updateCustomer);

export default router;
