"use client";
import { useEffect, useState } from "react";
import { API_URL } from "../../../lib/api";
import { formatRupees } from "../../../lib/money";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader } from "../../components/ui/Card";
import { LedgerTable, Th, Td } from "../../components/ui/LedgerTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";

type Tab = "txs" | "charges";

export default function CustomerDetailPage(){
  const params=useParams() as {id:string};
  const [cust,setCust]=useState<any>(null);
  const [txs,setTxs]=useState<any[]>([]);
  const [charges,setCharges]=useState<any[]>([]);
  const [tab,setTab]=useState<Tab>("txs");

  useEffect(()=>{
    if(!params.id) return;
    fetch(`${API_URL}/api/v1/customers/${params.id}`,{credentials:"include"}).then(r=>r.json()).then(setCust);
    fetch(`${API_URL}/api/v1/transactions?customerId=${params.id}`,{credentials:"include"}).then(r=>r.json()).then(setTxs);
    fetch(`${API_URL}/api/v1/charges?customerId=${params.id}`,{credentials:"include"}).then(r=>r.json()).then(setCharges);
  },[params.id]);

  if(!cust) return <div className="animate-pulse space-y-4"><div className="h-24 rounded-xl bg-line/30"/><div className="h-64 rounded-xl bg-line/20"/></div>;
  const c=cust as {name:string;username:string;outstandingPaise:number;monthlyRateBps:number; status:string; email?:string; phone?:string};

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <Link href="/customers" className="text-sm text-muted hover:text-ink inline-flex items-center gap-1">← Back to customers</Link>

      <Card className="overflow-hidden">
        <div className="h-1 bg-brass" />
        <div className="p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="display text-2xl md:text-3xl font-bold tracking-tight">{c.name} <span className="text-muted font-normal text-xl">@{c.username}</span></h1>
              <div className="mt-2 flex flex-wrap gap-2 items-center text-sm text-muted">
                <Badge tone={c.status==="active"?"success":"neutral"}>{c.status}</Badge>
                <span className="amount">{(c.monthlyRateBps/100).toFixed(2)}% per month</span>
                {c.email && <span>· {c.email}</span>}
                {c.phone && <span>· {c.phone}</span>}
              </div>
            </div>
            <a href={`${API_URL}/api/v1/exports/statement/${params.id}.pdf`} target="_blank" rel="noreferrer">
              <Button variant="secondary">Download PDF statement</Button>
            </a>
          </div>

          <div className="mt-6 rounded-xl border border-brass/20 bg-brass/[0.06] p-5 md:p-6">
            <div className="text-[11px] tracking-widest uppercase text-muted font-semibold">Outstanding</div>
            <div className="display amount text-3xl md:text-4xl font-bold tracking-tight mt-1">{formatRupees(c.outstandingPaise ?? 0)}</div>
            <div className="mt-3 h-[2px] w-16 bg-brass rounded-full" />
            <div className="mt-2 text-xs text-muted">What this customer owes right now, including unpaid charges.</div>
          </div>
        </div>
      </Card>

      <div className="flex gap-2 p-1 rounded-xl border border-line bg-paper w-fit">
        <button onClick={()=>setTab("txs")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab==="txs" ? "bg-indigo text-white shadow-sm" : "text-muted hover:text-ink"}`}>Transactions ({txs.length})</button>
        <button onClick={()=>setTab("charges")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab==="charges" ? "bg-indigo text-white shadow-sm" : "text-muted hover:text-ink"}`}>Charges ({charges.length})</button>
      </div>

      {tab==="txs" ? (
        <Card>
          <CardHeader><h2 className="font-semibold text-sm">Transactions</h2><span className="text-xs text-muted">Newest first as stored</span></CardHeader>
          {txs.length===0 ? <div className="p-8 text-center text-sm text-muted">No transactions yet.</div> : (
            <LedgerTable className="border-0 rounded-none">
              <thead><tr><Th>Date</Th><Th>Direction</Th><Th align="right">Amount</Th><Th>Note</Th></tr></thead>
              <tbody>
                {txs.map((t:any)=> (
                  <tr key={t.id} className="hover:bg-ink/[0.02] dark:hover:bg-white/[0.03]">
                    <Td className="amount text-xs">{String(t.occurredAt).slice(0,10)}</Td>
                    <Td><Badge tone={t.direction==="debit"?"danger":"success"}>{t.direction}</Badge></Td>
                    <Td align="right" className={`amount font-semibold ${t.direction==="debit"?"text-vermillion":"text-teal"}`}>{formatRupees(t.amountPaise)}</Td>
                    <Td className="text-sm max-w-[280px] truncate">{t.note ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </LedgerTable>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader><h2 className="font-semibold text-sm">Monthly charges</h2><span className="text-xs text-muted">Rate snapshot is locked at charge time</span></CardHeader>
          {charges.length===0 ? <div className="p-8 text-center text-sm text-muted">No charges yet. They are posted on the 1st at 00:05 IST.</div> : (
            <LedgerTable className="border-0 rounded-none">
              <thead><tr><Th>Month</Th><Th align="right">Rate</Th><Th align="right">Base</Th><Th align="right">Charge</Th><Th>Status</Th><Th align="right">Waived</Th></tr></thead>
              <tbody>
                {charges.map((ch:any)=> (
                  <tr key={ch.id} className="hover:bg-ink/[0.02] dark:hover:bg-white/[0.03]">
                    <Td className="amount font-medium">{ch.periodMonth}</Td>
                    <Td align="right" className="amount">{(Number(ch.rateSnapshotBps)/100).toFixed(2)}%</Td>
                    <Td align="right" className="amount">{formatRupees(ch.baseAmountPaise)}</Td>
                    <Td align="right" className="amount font-semibold">{formatRupees(ch.chargeAmountPaise)}</Td>
                    <Td><Badge tone={ch.status==="waived"?"danger":ch.status==="reduced"?"warning":"info"}>{ch.status}</Badge></Td>
                    <Td align="right" className="amount">{formatRupees(ch.waivedAmountPaise)}</Td>
                  </tr>
                ))}
              </tbody>
            </LedgerTable>
          )}
        </Card>
      )}
    </div>
  );
}
