import { Router } from "express";
import { z } from "zod";
import { store, newId, nowIso } from "../lib/store.js";
import { postTransaction } from "../lib/transactions.js";
import { writeAudit } from "../lib/audit.js";
import { requireAuth } from "../lib/auth.js";

export const transactionsRouter = Router();

const createSchema = z.object({
  direction: z.enum(["debit","credit"]),
  customerId: z.string().uuid(),
  sourceType: z.enum(["account","credit_card"]),
  sourceId: z.string().uuid(),
  amountPaise: z.number().int().positive(),
  occurredAt: z.string().datetime().optional(),
  note: z.string().max(2000).nullable().optional(),
});

function actor(req:unknown){ return (req as {user:{id:string}}).user?.id ?? null; }

transactionsRouter.use(requireAuth);

transactionsRouter.get("/", (req,res)=>{
  let list=[...store.transactions.values()];
  const { customerId, sourceType, sourceId, direction, from, to } = req.query as Record<string,string|undefined>;
  if(customerId) list=list.filter(t=> t.customerId===customerId);
  if(sourceType) list=list.filter(t=> t.sourceType===sourceType);
  if(sourceId) list=list.filter(t=> t.sourceId===sourceId);
  if(direction) list=list.filter(t=> t.direction===direction);
  if(from) list=list.filter(t=> new Date(t.occurredAt)>=new Date(from));
  if(to) list=list.filter(t=> new Date(t.occurredAt)<=new Date(to));
  list.sort((a,b)=> new Date(b.occurredAt).getTime()-new Date(a.occurredAt).getTime());
  res.json(list);
});

transactionsRouter.post("/", (req,res)=>{
  const p=createSchema.safeParse(req.body);
  if(!p.success) return res.status(400).json({error:p.error.flatten()});
  try{
    const tx=postTransaction({ direction:p.data.direction, customerId:p.data.customerId, sourceType:p.data.sourceType, sourceId:p.data.sourceId, amountPaise:p.data.amountPaise, occurredAt:p.data.occurredAt, note:p.data.note??null, createdBy:actor(req)});
    res.status(201).json(tx);
  }catch(e:unknown){
    const err=e as {message:string;statusCode?:number};
    res.status(err.statusCode ?? 400).json({error:err.message});
  }
});

transactionsRouter.post("/:id/reverse", (req,res)=>{
  const orig=store.transactions.get(req.params.id);
  if(!orig) return res.status(404).json({error:"not found"});
  // Check already reversed? allow multiple reversals but track
  const revDir = orig.direction==="debit" ? "credit" : "debit";
  try{
    const tx=postTransaction({ direction:revDir, customerId:orig.customerId, sourceType:orig.sourceType, sourceId:orig.sourceId, amountPaise:orig.amountPaise, note:`Reversal of ${orig.id}`, createdBy:actor(req)});
    // link
    (tx as {reversedFromId:string|null}).reversedFromId = orig.id;
    writeAudit({actorId:actor(req), action:"transaction.reverse", entityType:"transaction", entityId:tx.id, before:orig, after:tx});
    res.status(201).json(tx);
  }catch(e:unknown){
    const err=e as {message:string;statusCode?:number};
    res.status(err.statusCode ?? 400).json({error:err.message});
  }
});
