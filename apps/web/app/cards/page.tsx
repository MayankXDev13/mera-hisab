"use client";
import { useEffect, useState, useCallback } from "react";
import { API_URL } from "../../lib/api";
import { formatRupees, rupeesToPaise } from "../../lib/money";
import { Button } from "../components/ui/Button";
import { Input, Field } from "../components/ui/Field";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

type CardT = { id:string; issuer:string; last4:string; totalLimitPaise:number; usedPaise:number; availablePaise:number; status:string };

export default function CardsPage(){
  const [list,setList]=useState<CardT[]>([]);
  const [issuer,setIssuer]=useState(""); const [last4,setLast4]=useState(""); const [limit,setLimit]=useState("");
  const [editing,setEditing]=useState<string|null>(null);
  const [err,setErr]=useState(""); const [confirmId,setConfirmId]=useState<string|null>(null);
  const load = useCallback(async ()=>{ const r=await fetch(`${API_URL}/api/v1/cards`,{credentials:"include"}); if(r.ok) setList(await r.json()); },[]);
  useEffect(()=>{ void load(); },[load]);
  async function submit(e:React.FormEvent){
    e.preventDefault(); setErr("");
    const method=editing?"PATCH":"POST"; const url=editing?`${API_URL}/api/v1/cards/${editing}`:`${API_URL}/api/v1/cards`;
    const body:Record<string,unknown>=editing?{issuer,last4}:{issuer,last4,totalLimitPaise:rupeesToPaise(limit)};
    if(editing && limit) body.totalLimitPaise=rupeesToPaise(limit);
    const res=await fetch(url,{method,credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!res.ok){ const j=await res.json().catch(()=>null) as {message?:string}|null; setErr(j?.message ?? "Could not save card."); return; }
    setIssuer("");setLast4("");setLimit("");setEditing(null);void load();
  }
  async function deactivate(id:string){ await fetch(`${API_URL}/api/v1/cards/${id}/deactivate`,{method:"POST",credentials:"include"}); setConfirmId(null); void load(); }
  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div>
        <h1 className="display text-2xl md:text-3xl font-bold tracking-tight">Cards</h1>
        <p className="text-sm text-muted mt-1">Credit cards you lend from. Used limit rises when you disburse and falls when repayment comes back to the same card.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-sm">{editing?"Edit card":"Add card"}</h2>
          {editing && <Button variant="ghost" onClick={()=>{setEditing(null);setIssuer("");setLast4("");setLimit("");}}>Cancel</Button>}
        </CardHeader>
        <CardBody>
          <form onSubmit={submit} className="grid md:grid-cols-[1fr_0.6fr_0.8fr_auto] gap-3 items-end">
            <Field label="Issuer"><Input placeholder="HDFC Infinia" value={issuer} onChange={e=>setIssuer(e.target.value)} required /></Field>
            <Field label="Last 4"><Input placeholder="4521" value={last4} onChange={e=>setLast4(e.target.value)} required /></Field>
            <Field label={editing?"New limit (optional)":"Limit (rupees)"}><Input placeholder="200000" value={limit} onChange={e=>setLimit(e.target.value)} required={!editing} /></Field>
            <Button type="submit">{editing?"Update":"Create"}</Button>
          </form>
          {err && <div className="mt-3 rounded-lg border border-vermillion/20 bg-vermillion/5 px-3 py-2 text-sm text-vermillion">{err}</div>}
        </CardBody>
      </Card>

      {list.length===0 ? <EmptyState title="No cards yet" desc="Add a card with issuer, last four digits and total limit. Available limit is tracked automatically." /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {list.map(c=>{
            const pct=c.totalLimitPaise ? (c.usedPaise/c.totalLimitPaise)*100 : 0;
            return (
              <Card key={c.id} className="overflow-hidden">
                <div className="h-1 bg-indigo" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{c.issuer}</div>
                      <div className="amount text-sm text-muted">···· ···· ···· {c.last4}</div>
                    </div>
                    <Badge tone={c.status==="active"?"success":"neutral"}>{c.status}</Badge>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs text-muted"><span>Used</span><span>Available</span></div>
                    <div className="h-2 rounded-full bg-line overflow-hidden"><div className="h-full bg-indigo rounded-full" style={{width:`${Math.min(pct,100)}%`}} /></div>
                    <div className="flex justify-between text-sm"><span className="amount font-semibold">{formatRupees(c.usedPaise)}</span><span className="amount font-semibold text-teal">{formatRupees(c.availablePaise)}</span></div>
                    <div className="text-xs text-muted">Limit <span className="amount">{formatRupees(c.totalLimitPaise)}</span></div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="secondary" onClick={()=>{setEditing(c.id);setIssuer(c.issuer);setLast4(c.last4);setLimit("");}}>Edit</Button>
                    {c.status==="active" && <Button variant="ghost" onClick={()=>setConfirmId(c.id)}>Deactivate</Button>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <ConfirmDialog open={!!confirmId} title="Deactivate card?" desc="This card will no longer appear as a source. Past transactions keep their source link." confirmLabel="Deactivate" tone="danger" onClose={()=>setConfirmId(null)} onConfirm={()=>confirmId && deactivate(confirmId)} />
    </div>
  );
}
