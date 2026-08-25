"use client";
import { useEffect, useState, useCallback } from "react";
import { API_URL } from "../../lib/api";
import { formatRupees, rupeesToPaise } from "../../lib/money";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { Card, CardHeader } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { LedgerTable, Th, Td } from "../components/ui/LedgerTable";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

type Charge = { id:string; customerId:string; periodMonth:string; rateSnapshotBps:number; baseAmountPaise:number; chargeAmountPaise:number; status:string; waivedAmountPaise:number };

export default function ChargesPage(){
  const [list,setList]=useState<Charge[]>([]);
  const [reduceAmt,setReduceAmt]=useState<Record<string,string>>({});
  const [msg,setMsg]=useState("");
  const [pendingWaive,setPendingWaive]=useState<{id:string; amount?:string}|null>(null);
  const [pendingRun,setPendingRun]=useState(false);
  const load = useCallback(async ()=>{ const r=await fetch(`${API_URL}/api/v1/charges`,{credentials:"include"}); if(r.ok) setList(await r.json()); },[]);
  useEffect(()=>{ void load(); },[load]);
  async function run(){ setMsg(""); await fetch(`${API_URL}/api/v1/charges/run`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({})}); setPendingRun(false); setMsg("Charge run completed. Duplicate months are skipped."); void load(); }
  async function waive(id:string, amount?:string){
    const body:Record<string,unknown>=amount?{amountPaise:rupeesToPaise(amount)}:{};
    const res=await fetch(`${API_URL}/api/v1/charges/${id}/waive`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!res.ok){ const j=await res.json().catch(()=>null) as {message?:string}|null; setMsg(j?.message ?? "Could not waive charge."); }
    else setMsg(amount ? `Charge reduced by ${formatRupees(rupeesToPaise(amount))}.` : "Charge waived. Adjusting entry posted.");
    setPendingWaive(null); void load();
  }
  const grouped:Record<string,typeof list>={};
  for(const c of list){ const arr=grouped[c.periodMonth] ?? []; arr.push(c); grouped[c.periodMonth]=arr; }

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="display text-2xl md:text-3xl font-bold tracking-tight">Charges</h1>
          <p className="text-sm text-muted mt-1">Monthly percentage on outstanding, posted on the 1st at 00:05 IST. Compounding included. Waivers post as adjusting entries.</p>
        </div>
        <Button variant="secondary" onClick={()=>setPendingRun(true)}>Run charges now</Button>
      </div>
      {msg && <div className="rounded-lg border border-indigo/20 bg-indigo/5 px-3 py-2.5 text-sm text-indigo">{msg}</div>}

      {Object.keys(grouped).length===0 ? (
        <Card><div className="p-8 text-center text-sm text-muted">No charges yet.</div></Card>
      ) : Object.keys(grouped).sort().reverse().map(month=> (
        <Card key={month} className="overflow-hidden">
          <CardHeader>
            <h3 className="font-semibold amount">{month}</h3>
            <span className="text-xs text-muted">{(grouped[month] ?? []).length} charges</span>
          </CardHeader>
          <LedgerTable className="border-0 rounded-none">
            <thead><tr><Th>Customer</Th><Th align="right">Rate</Th><Th align="right">Base</Th><Th align="right">Charge</Th><Th>Status</Th><Th align="right">Waived</Th><Th align="right"></Th></tr></thead>
            <tbody>
              {(grouped[month] ?? []).map(c=> (
                <tr key={c.id} className="hover:bg-ink/[0.02] dark:hover:bg-white/[0.03]">
                  <Td className="font-mono text-xs">{c.customerId.slice(0,8)}</Td>
                  <Td align="right" className="amount">{(c.rateSnapshotBps/100).toFixed(2)}%</Td>
                  <Td align="right" className="amount">{formatRupees(c.baseAmountPaise)}</Td>
                  <Td align="right" className="amount font-semibold">{formatRupees(c.chargeAmountPaise)}</Td>
                  <Td><Badge tone={c.status==="waived"?"danger":c.status==="reduced"?"warning":"info"}>{c.status}</Badge></Td>
                  <Td align="right" className="amount">{formatRupees(c.waivedAmountPaise)}</Td>
                  <Td align="right">
                    {c.status!=="waived" && (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" onClick={()=>setPendingWaive({id:c.id})}>Waive all</Button>
                        <div className="flex items-center gap-1">
                          <Input placeholder="Reduce by" value={reduceAmt[c.id]??""} onChange={e=>setReduceAmt({...reduceAmt,[c.id]:e.target.value})} className="w-[110px] h-8 py-1 text-xs" />
                          <Button variant="secondary" onClick={()=>setPendingWaive({id:c.id, amount: reduceAmt[c.id]})}>Reduce</Button>
                        </div>
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </LedgerTable>
        </Card>
      ))}
      <ConfirmDialog open={!!pendingWaive} title={pendingWaive?.amount ? "Reduce this charge?" : "Waive this charge?"} desc={pendingWaive?.amount ? `Reduce by ${pendingWaive.amount ? formatRupees(rupeesToPaise(pendingWaive.amount)) : ""}. A reversing adjustment will be posted.` : "Waive the entire charge. A reversing adjustment will be posted and the original stays for audit."} confirmLabel={pendingWaive?.amount ? "Reduce" : "Waive"} tone="danger" onClose={()=>setPendingWaive(null)} onConfirm={()=>pendingWaive && waive(pendingWaive.id, pendingWaive.amount)} />
      <ConfirmDialog open={pendingRun} title="Run monthly charges?" desc="This posts charges for the current month for every active customer with outstanding. Running twice does not double post." confirmLabel="Run" onClose={()=>setPendingRun(false)} onConfirm={run} />
    </div>
  );
}
