import { Router } from "express";
import { store } from "../lib/store.js";
import { requireAuth } from "../lib/auth.js";

export const auditRouter = Router();

auditRouter.use(requireAuth);

auditRouter.get("/", (req,res)=>{
  const { action, entityType, entityId, actorId, from, to, q, page, limit } = req.query as Record<string,string|undefined>;
  let list=[...store.auditLogs];
  if(action) list=list.filter(l=> l.action===action);
  if(entityType) list=list.filter(l=> l.entityType===entityType);
  if(entityId) list=list.filter(l=> l.entityId===entityId);
  if(actorId) list=list.filter(l=> l.actorId===actorId);
  if(q) list=list.filter(l=> l.entityId.includes(q) || l.action.includes(q));
  if(from) list=list.filter(l=> new Date(l.createdAt)>=new Date(from));
  if(to) list=list.filter(l=> new Date(l.createdAt)<=new Date(to));
  list.sort((a,b)=> new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
  const p=Math.max(1, parseInt(page??"1",10));
  const lim=Math.min(100, Math.max(1, parseInt(limit??"20",10)));
  const start=(p-1)*lim;
  res.json({ data: list.slice(start,start+lim), total:list.length, page:p, limit:lim });
});

// No PUT/DELETE routes - read-only
