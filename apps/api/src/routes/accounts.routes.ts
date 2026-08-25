import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import { validateBody } from "../lib/validate.js";
import { createAccountSchema, updateAccountSchema } from "@repo/shared";
import * as ctrl from "../controllers/accounts.controller.js";

export const accountsRouter = Router();
accountsRouter.use(requireAuth);
accountsRouter.get("/", ctrl.listAccounts);
accountsRouter.post("/", validateBody(createAccountSchema), ctrl.createAccount);
accountsRouter.get("/:id", ctrl.getAccount);
accountsRouter.patch("/:id", validateBody(updateAccountSchema), ctrl.updateAccount);
accountsRouter.post("/:id/deactivate", ctrl.deactivateAccount);
