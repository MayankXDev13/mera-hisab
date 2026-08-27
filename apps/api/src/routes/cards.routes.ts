import { Router } from "express";
import { createCardSchema, updateCardSchema } from "@repo/schemas";
import { validateBody } from "@repo/schemas";
import { requireSession } from "../middlewares/auth.js";
import { createCardsController } from "../controllers/cards.controller.js";
import { asyncHandler } from "../lib/http/asyncHandler.js";
import "../lib/http/types.js";

export const createCardsRoutes = (controller = createCardsController()) => {
  const router = Router();
  router.use(requireSession);
  router.get("/", asyncHandler(controller.listCards));
  router.get("/:id", asyncHandler(controller.getCard));
  router.post("/", validateBody(createCardSchema), asyncHandler(controller.createCard));
  router.patch("/:id", validateBody(updateCardSchema), asyncHandler(controller.updateCard));
  return router;
};

export default createCardsRoutes();
