import { Router } from "express";
import { z } from "zod";
import { store } from "../lib/store.js";
import { runMonthlyCharges, waiveOrReduceCharge } from "../lib/charges.js";
import { requireAuth } from "../lib/auth.js";

export const chargesRouter = Router();

chargesRouter.use(requireAuth);

chargesRouter.get("/", (req,res)=>{
  const { customerId, periodMonth } = req.query as Record<string,string|undefined>;
  let list=[...store.charges.values()];
  if(customerId) list=list.filter(c=> c.customerId===customerId);
  if(periodMonth) list=list.filter(c=> c.periodMonth===periodMonth);
  list.sort((a,b)=> b.periodMonth.localeCompare(a.periodMonth));
  res.json(list);
});

chargesRouter.post("/run", (req,res)=>{
  const actorId=(req as unknown as {user:{id:string}}).user.id;
  // optional now override for tests
  const nowStr = (req.body as { now?: string })?.now;
  const now = nowStr ? new Date(nowStr) : undefined;
  const result=runMonthlyCharges({ now, actorId });
  res.json(result);
});

const waiveSchema=z.object({ amountPaise: z.number().int().positive().optional() });

chargesRouter.post("/:id/waive", (req,res)=>{
  const p=waiveSchema.safeParse(req.body ?? {});
  if(!p.success) return res.status(400).json({error:p.error.flatten()});
  const actorId=(req as unknown as {user:{id:string}}).user.id;
  try{
    const r=waiveOrReduceCharge({ chargeId:req.params.id, amountPaise:p.data.amountPaise, actorId });
    res.json(r.charge);
  }catch(e:unknown){
    const err=e as {message:string;statusCode?:number};
    res.status(err.statusCode ?? 400).json({error:err.message});
  }
});
