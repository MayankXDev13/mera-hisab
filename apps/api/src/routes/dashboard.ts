import { Router } from "express";
import { store, nowIso } from "../lib/store.js";
import { computeOutstanding } from "../lib/transactions.js";
import { requireAuth } from "../lib/auth.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get("/", (_req,res)=>{
  // SQL-like aggregations
  let totalDisbursed=0, totalReceived=0, totalCharges=0, totalWaived=0;
  for(const tx of store.transactions.values()){
    if(tx.monthlyChargeId){
      // charge related: debit is charge, credit is waiver
      if(tx.direction==="debit") totalCharges+=tx.amountPaise;
      else totalWaived+=tx.amountPaise;
    } else {
      if(tx.direction==="debit") totalDisbursed+=tx.amountPaise;
      else totalReceived+=tx.amountPaise;
    }
  }
  // outstanding = sum debits - credits
  let outstanding=0;
  for(const tx of store.transactions.values()){
    if(tx.direction==="debit") outstanding+=tx.amountPaise;
    else outstanding-=tx.amountPaise;
  }

  const accounts=[...store.accounts.values()].filter(a=> a.status==="active").map(a=> ({...a}));
  const cards=[...store.cards.values()].filter(c=> c.status==="active").map(c=> ({...c, availablePaise:c.totalLimitPaise-c.usedPaise}));
  const customers=[...store.customers.values()].filter(c=> c.status==="active").map(c=> ({id:c.id,name:c.name,username:c.username,outstandingPaise:computeOutstanding(c.id)})).sort((a,b)=> b.outstandingPaise - a.outstandingPaise);

  res.json({ totals:{ totalDisbursed, totalReceived, totalCharges, totalWaived, outstanding }, accounts, cards, customers });
});
