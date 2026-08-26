import { Router } from "express";
import { createBankAccountSchema as createAccountSchema, updateBankAccountSchema as updateAccountSchema } from "@repo/schemas";
import { validateBody } from "@repo/schemas";
import { requireSession } from "../middlewares/auth.js";
import { listAccounts, getAccount, createAccount, updateAccount } from "../controllers/accounts.controller.js";

const router = Router();

router.use(requireSession);
router.get("/", listAccounts);
router.get("/:id", getAccount);
router.post("/", validateBody(createAccountSchema), createAccount);
router.patch("/:id", validateBody(updateAccountSchema), updateAccount);

export default router;
