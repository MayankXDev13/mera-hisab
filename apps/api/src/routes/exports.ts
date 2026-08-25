import { Router } from "express";
import { store } from "../lib/store.js";
import { requireAuth } from "../lib/auth.js";
import PDFDocument from "pdfkit";

export const exportsRouter = Router();

exportsRouter.use(requireAuth);

function csvEscape(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

exportsRouter.get("/transactions.csv", (req,res)=>{
  const { customerId, sourceType, sourceId, direction, from, to } = req.query as Record<string,string|undefined>;
  let list=[...store.transactions.values()];
  if(customerId) list=list.filter(t=> t.customerId===customerId);
  if(sourceType) list=list.filter(t=> t.sourceType===sourceType);
  if(sourceId) list=list.filter(t=> t.sourceId===sourceId);
  if(direction) list=list.filter(t=> t.direction===direction);
  if(from) list=list.filter(t=> new Date(t.occurredAt)>=new Date(from));
  if(to) list=list.filter(t=> new Date(t.occurredAt)<=new Date(to));
  list.sort((a,b)=> new Date(a.occurredAt).getTime()-new Date(b.occurredAt).getTime());
  res.setHeader("Content-Type","text/csv");
  res.setHeader("Content-Disposition","attachment; filename=transactions.csv");
  res.write("id,direction,amountPaise,amountRupees,customerId,sourceType,sourceId,occurredAt,note\n");
  for(const t of list){
    const row=[t.id,t.direction,String(t.amountPaise),(t.amountPaise/100).toFixed(2),t.customerId,t.sourceType,t.sourceId,t.occurredAt,csvEscape(t.note??"")].join(",");
    res.write(row+"\n");
  }
  res.end();
});

exportsRouter.get("/customers.csv", (_req,res)=>{
  res.setHeader("Content-Type","text/csv");
  res.setHeader("Content-Disposition","attachment; filename=customers.csv");
  res.write("id,name,username,email,phone,monthlyRateBps,status\n");
  for(const c of store.customers.values()){
    res.write([c.id,csvEscape(c.name),csvEscape(c.username),csvEscape(c.email??""),csvEscape(c.phone??""),String(c.monthlyRateBps),c.status].join(",")+"\n");
  }
  res.end();
});

exportsRouter.get("/charges.csv", (req,res)=>{
  const { customerId } = req.query as Record<string,string|undefined>;
  let list=[...store.charges.values()];
  if(customerId) list=list.filter(c=> c.customerId===customerId);
  res.setHeader("Content-Type","text/csv");
  res.setHeader("Content-Disposition","attachment; filename=charges.csv");
  res.write("id,customerId,periodMonth,rateBps,basePaise,chargePaise,status,waivedPaise\n");
  for(const c of list){
    res.write([c.id,c.customerId,c.periodMonth,String(c.rateSnapshotBps),String(c.baseAmountPaise),String(c.chargeAmountPaise),c.status,String(c.waivedAmountPaise)].join(",")+"\n");
  }
  res.end();
});

exportsRouter.get("/statement/:customerId.pdf", (req,res)=>{
  const cust=store.customers.get(req.params.customerId);
  if(!cust) return res.status(404).json({error:"customer not found"});
  const from = req.query.from as string|undefined;
  const to = req.query.to as string|undefined;
  let txs=[...store.transactions.values()].filter(t=> t.customerId===cust.id);
  if(from) txs=txs.filter(t=> new Date(t.occurredAt)>=new Date(from));
  if(to) txs=txs.filter(t=> new Date(t.occurredAt)<=new Date(to));
  txs.sort((a,b)=> new Date(a.occurredAt).getTime()-new Date(b.occurredAt).getTime());
  const charges=[...store.charges.values()].filter(c=> c.customerId===cust.id).sort((a,b)=> a.periodMonth.localeCompare(b.periodMonth));

  res.setHeader("Content-Type","application/pdf");
  res.setHeader("Content-Disposition",`attachment; filename=statement-${cust.username}.pdf`);
  const doc=new PDFDocument({ margin: 40 });
  doc.pipe(res);
  doc.fontSize(16).text(`Statement - ${cust.name} (${cust.username})`);
  doc.fontSize(10).text(`Email: ${cust.email ?? "-"}  Phone: ${cust.phone ?? "-"}`);
  doc.moveDown();
  doc.fontSize(12).text("Transactions");
  let running=0;
  for(const t of txs){
    if(t.direction==="debit") running+=t.amountPaise; else running-=t.amountPaise;
    doc.fontSize(8).text(`${t.occurredAt.slice(0,10)}  ${t.direction.toUpperCase().padEnd(6)}  ₹${(t.amountPaise/100).toFixed(2).padStart(10)}  bal ₹${(running/100).toFixed(2)}  ${t.note??""}`);
  }
  doc.moveDown();
  doc.fontSize(12).text("Charges");
  for(const c of charges){
    doc.fontSize(8).text(`${c.periodMonth}  rate ${(c.rateSnapshotBps/100).toFixed(2)}%  base ₹${(c.baseAmountPaise/100).toFixed(2)}  charge ₹${(c.chargeAmountPaise/100).toFixed(2)}  status ${c.status} waived ₹${(c.waivedAmountPaise/100).toFixed(2)}`);
  }
  doc.moveDown();
  doc.fontSize(10).text(`Closing outstanding: ₹${(running/100).toFixed(2)}`);
  doc.end();
});
