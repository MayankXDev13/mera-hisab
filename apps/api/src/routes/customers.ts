import { Router } from "express";
import { z } from "zod";
import { store, newId, nowIso } from "../lib/store.js";
import { writeAudit } from "../lib/audit.js";
import { requireAuth } from "../lib/auth.js";
import { computeOutstanding } from "../lib/transactions.js";

export const customersRouter = Router();

const createSchema = z.object({
  name: z.string().min(1).max(200),
  username: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/, "invalid username"),
  email: z.string().email().nullable().optional(),
  phone: z.string().regex(/^\+?[0-9\s-]{7,20}$/).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  monthlyRatePct: z.number().min(0).max(100),
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  username: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().regex(/^\+?[0-9\s-]{7,20}$/).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  monthlyRatePct: z.number().min(0).max(100).optional(),
});

function actor(req: unknown){ return (req as {user:{id:string}}).user?.id ?? null; }
function toRateBps(pct:number){ return Math.round(pct*100); }

customersRouter.use(requireAuth);

customersRouter.get("/", (req,res)=>{
  const q = (req.query.q as string|undefined)?.toLowerCase();
  let list=[...store.customers.values()];
  if(q) list=list.filter(c=> c.name.toLowerCase().includes(q) || c.username.toLowerCase().includes(q) || (c.email??"").toLowerCase().includes(q));
  res.json(list.map(c=> ({...c, outstandingPaise: computeOutstanding(c.id)})));
});

customersRouter.post("/", (req,res)=>{
  const p=createSchema.safeParse(req.body);
  if(!p.success) return res.status(400).json({error:p.error.flatten()});
  const username=p.data.username.toLowerCase();
  if(store.customersByUsername.has(username)) return res.status(409).json({error:"username already exists"});
  const id=newId();
  const c={ id, name:p.data.name, username:p.data.username, email:p.data.email??null, phone:p.data.phone??null, notes:p.data.notes??null, monthlyRateBps:toRateBps(p.data.monthlyRatePct), status:"active" as const, createdAt:nowIso(), updatedAt:nowIso()};
  store.customers.set(id,c);
  store.customersByUsername.set(username,id);
  writeAudit({actorId:actor(req), action:"customer.create", entityType:"customer", entityId:id, before:null, after:c});
  res.status(201).json(c);
});

customersRouter.get("/:id",(req,res)=>{
  const c=store.customers.get(req.params.id);
  if(!c) return res.status(404).json({error:"not found"});
  res.json({...c, outstandingPaise: computeOutstanding(c.id)});
});

customersRouter.patch("/:id",(req,res)=>{
  const c=store.customers.get(req.params.id);
  if(!c) return res.status(404).json({error:"not found"});
  const p=updateSchema.safeParse(req.body);
  if(!p.success) return res.status(400).json({error:p.error.flatten()});
  const before={...c};
  if(p.data.username!==undefined){
    const uname=p.data.username.toLowerCase();
    const existing=store.customersByUsername.get(uname);
    if(existing && existing!==c.id) return res.status(409).json({error:"username already exists"});
    store.customersByUsername.delete(c.username.toLowerCase());
    c.username=p.data.username;
    store.customersByUsername.set(c.username.toLowerCase(), c.id);
  }
  if(p.data.name!==undefined) c.name=p.data.name;
  if(p.data.email!==undefined) c.email=p.data.email??null;
  if(p.data.phone!==undefined) c.phone=p.data.phone??null;
  if(p.data.notes!==undefined) c.notes=p.data.notes??null;
  if(p.data.monthlyRatePct!==undefined) c.monthlyRateBps=toRateBps(p.data.monthlyRatePct);
  c.updatedAt=nowIso();
  writeAudit({actorId:actor(req), action:"customer.update", entityType:"customer", entityId:c.id, before, after:{...c}});
  res.json(c);
});

customersRouter.post("/:id/deactivate",(req,res)=>{
  const c=store.customers.get(req.params.id);
  if(!c) return res.status(404).json({error:"not found"});
  const before={...c};
  c.status="deactivated"; c.updatedAt=nowIso();
  writeAudit({actorId:actor(req), action:"customer.deactivate", entityType:"customer", entityId:c.id, before, after:{...c}});
  res.json(c);
});
