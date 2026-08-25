import { Router } from "express";
import { z } from "zod";
import { store, newId, nowIso } from "../lib/store.js";
import { writeAudit } from "../lib/audit.js";
import { requireAuth } from "../lib/auth.js";

export const cardsRouter = Router();

const createSchema = z.object({
  issuer: z.string().min(1).max(200),
  last4: z.string().regex(/^\d{4}$/, "last4 must be 4 digits"),
  totalLimitPaise: z.number().int().positive(),
});

const updateSchema = z.object({
  issuer: z.string().min(1).max(200).optional(),
  last4: z.string().regex(/^\d{4}$/).optional(),
  totalLimitPaise: z.number().int().positive().optional(),
});

function actor(req: unknown){ return (req as {user:{id:string}}).user?.id ?? null; }

cardsRouter.use(requireAuth);

cardsRouter.get("/", (_req,res)=> res.json([...store.cards.values()]));

cardsRouter.post("/", (req,res)=>{
  const p=createSchema.safeParse(req.body);
  if(!p.success) return res.status(400).json({error:p.error.flatten()});
  const id=newId();
  const c={ id, issuer:p.data.issuer, last4:p.data.last4, totalLimitPaise:p.data.totalLimitPaise, usedPaise:0, status:"active" as const, createdAt:nowIso(), updatedAt:nowIso()};
  store.cards.set(id,c);
  writeAudit({ actorId:actor(req), action:"card.create", entityType:"credit_card", entityId:id, before:null, after:c});
  res.status(201).json({...c, availablePaise:c.totalLimitPaise-c.usedPaise});
});

cardsRouter.get("/:id",(req,res)=>{
  const c=store.cards.get(req.params.id);
  if(!c) return res.status(404).json({error:"not found"});
  res.json({...c, availablePaise:c.totalLimitPaise-c.usedPaise});
});

cardsRouter.patch("/:id",(req,res)=>{
  const c=store.cards.get(req.params.id);
  if(!c) return res.status(404).json({error:"not found"});
  const p=updateSchema.safeParse(req.body);
  if(!p.success) return res.status(400).json({error:p.error.flatten()});
  const before={...c};
  if(p.data.issuer!==undefined) c.issuer=p.data.issuer;
  if(p.data.last4!==undefined) c.last4=p.data.last4;
  if(p.data.totalLimitPaise!==undefined){
    if(c.usedPaise>p.data.totalLimitPaise) return res.status(400).json({error:"used exceeds new limit"});
    c.totalLimitPaise=p.data.totalLimitPaise;
  }
  c.updatedAt=nowIso();
  writeAudit({actorId:actor(req), action:"card.update", entityType:"credit_card", entityId:c.id, before, after:{...c}});
  res.json({...c, availablePaise:c.totalLimitPaise-c.usedPaise});
});

cardsRouter.post("/:id/deactivate",(req,res)=>{
  const c=store.cards.get(req.params.id);
  if(!c) return res.status(404).json({error:"not found"});
  const before={...c};
  c.status="deactivated"; c.updatedAt=nowIso();
  writeAudit({actorId:actor(req), action:"card.deactivate", entityType:"credit_card", entityId:c.id, before, after:{...c}});
  res.json(c);
});
