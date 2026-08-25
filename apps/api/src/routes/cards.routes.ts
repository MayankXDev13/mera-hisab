import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import { validateBody } from "../lib/validate.js";
import { createCardSchema, updateCardSchema } from "@repo/shared";
import * as ctrl from "../controllers/cards.controller.js";

export const cardsRouter = Router();
cardsRouter.use(requireAuth);
cardsRouter.get("/", ctrl.listCards);
cardsRouter.post("/", validateBody(createCardSchema), ctrl.createCard);
cardsRouter.get("/:id", ctrl.getCard);
cardsRouter.patch("/:id", validateBody(updateCardSchema), ctrl.updateCard);
cardsRouter.post("/:id/deactivate", ctrl.deactivateCard);
