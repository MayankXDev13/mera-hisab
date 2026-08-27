import { Router } from "express";
import { createBankAccountSchema as createAccountSchema, updateBankAccountSchema as updateAccountSchema } from "@repo/schemas";
import { validateBody } from "@repo/schemas";
import { requireSession } from "../middlewares/auth.js";
import { createAccountsController } from "../controllers/accounts.controller.js";
import { asyncHandler } from "../lib/http/asyncHandler.js";
import "../lib/http/types.js";

export const createAccountsRoutes = (controller = createAccountsController()) => {
  const router = Router();
  router.use(requireSession);
  router.get("/", asyncHandler(controller.listAccounts));
  router.get("/:id", asyncHandler(controller.getAccount));
  router.post("/", validateBody(createAccountSchema), asyncHandler(controller.createAccount));
  router.patch("/:id", validateBody(updateAccountSchema), asyncHandler(controller.updateAccount));
  return router;
};

export default createAccountsRoutes();
