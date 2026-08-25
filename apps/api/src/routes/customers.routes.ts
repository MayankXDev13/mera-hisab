import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import { validateBody } from "../lib/validate.js";
import { createCustomerSchema, updateCustomerSchema } from "@repo/shared";
import * as ctrl from "../controllers/customers.controller.js";

export const customersRouter = Router();
customersRouter.use(requireAuth);
customersRouter.get("/", ctrl.listCustomers);
customersRouter.post("/", validateBody(createCustomerSchema), ctrl.createCustomer);
customersRouter.get("/:id", ctrl.getCustomer);
customersRouter.patch("/:id", validateBody(updateCustomerSchema), ctrl.updateCustomer);
customersRouter.post("/:id/deactivate", ctrl.deactivateCustomer);
