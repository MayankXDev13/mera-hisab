import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import * as ctrl from "../controllers/customers.controller.js";

export const customersRouter = Router();
customersRouter.use(requireAuth);
customersRouter.get("/", ctrl.listCustomers);
customersRouter.post("/", ctrl.createCustomer);
customersRouter.get("/:id", ctrl.getCustomer);
customersRouter.patch("/:id", ctrl.updateCustomer);
customersRouter.post("/:id/deactivate", ctrl.deactivateCustomer);
