import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import * as ctrl from "../controllers/cards.controller.js";

export const cardsRouter = Router();
cardsRouter.use(requireAuth);
cardsRouter.get("/", ctrl.listCards);
cardsRouter.post("/", ctrl.createCard);
cardsRouter.get("/:id", ctrl.getCard);
cardsRouter.patch("/:id", ctrl.updateCard);
cardsRouter.post("/:id/deactivate", ctrl.deactivateCard);
