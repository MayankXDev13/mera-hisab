import { Router } from "express";
import { createCustomerSchema, updateCustomerSchema } from "@repo/schemas";
import { validateBody } from "@repo/schemas";
import { requireSession } from "../middlewares/auth.js";
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from "../controllers/customers.controller.js";

const router = Router();

router.use(requireSession);

router.post("/", validateBody(createCustomerSchema), createCustomer);
router.get("/", listCustomers);
router.get("/:id", getCustomer);
router.patch("/:id", validateBody(updateCustomerSchema), updateCustomer);
router.delete("/:id", deleteCustomer);


export default router;