import { Router } from "express";
import { createAccountSchema, updateAccountSchema } from "@repo/schemas";
import { validateBody } from "../lib/validate.js";
import { requireSession } from "../middlewares/auth.js";
import { listAccounts, getAccount, createAccount, updateAccount } from "../controllers/accounts.controller.js";

const router = Router();

router.use(requireSession);
router.get("/", listAccounts);
router.get("/:id", getAccount);
router.post("/", validateBody(createAccountSchema), createAccount);
router.patch("/:id", validateBody(updateAccountSchema), updateAccount);

export default router;
