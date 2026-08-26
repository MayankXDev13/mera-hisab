import { Router } from "express";
import { createCardSchema, updateCardSchema } from "@repo/schemas";
import { validateBody } from "@repo/schemas";
import { requireSession } from "../middlewares/auth.js";
import { listCards, getCard, createCard, updateCard } from "../controllers/cards.controller.js";

const router = Router();

router.use(requireSession);
router.get("/", listCards);
router.get("/:id", getCard);
router.post("/", validateBody(createCardSchema), createCard);
router.patch("/:id", validateBody(updateCardSchema), updateCard);

export default router;
