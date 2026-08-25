"use client";
import { useEffect, useState, useCallback } from "react";
import { API_URL } from "../../lib/api";
import { formatRupees, rupeesToPaise } from "../../lib/money";
import { Button } from "../components/ui/Button";
import { Input, Select, Field } from "../components/ui/Field";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import { LedgerTable, Th, Td } from "../components/ui/LedgerTable";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

type Account = { id:string; name:string; type:string; openingBalancePaise:number; currentBalancePaise:number; status:string };

export default function AccountsPage(){
  const [list,setList]=useState<Account[]>([]);
  const [name,setName]=useState(""); const [type,setType]=useState("savings"); const [bal,setBal]=useState("");
  const [editing,setEditing]=useState<string|null>(null);
  const [err,setErr]=useState(""); const [confirmId,setConfirmId]=useState<string|null>(null);
  const load = useCallback(async ()=>{ const r=await fetch(`${API_URL}/api/v1/accounts`,{credentials:"include"}); if(r.ok) setList(await r.json()); },[]);
  useEffect(()=>{ void load(); },[load]);
  async function create(e:React.FormEvent){
    e.preventDefault(); setErr("");
    const method=editing?"PATCH":"POST"; const url=editing?`${API_URL}/api/v1/accounts/${editing}`:`${API_URL}/api/v1/accounts`;
    const body:Record<string,unknown>=editing?{name,type}:{name,type,openingBalancePaise:rupeesToPaise(bal)};
    const res=await fetch(url,{method,credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!res.ok){ const j=await res.json().catch(()=>null) as {message?:string}|null; setErr(j?.message ?? "Could not save account."); return; }
    setName(""); setBal(""); setEditing(null); void load();
  }
  async function deactivate(id:string){ await fetch(`${API_URL}/api/v1/accounts/${id}/deactivate`,{method:"POST",credentials:"include"}); setConfirmId(null); void load(); }
  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div>
        <h1 className="display text-2xl md:text-3xl font-bold tracking-tight">Accounts</h1>
        <p className="text-sm text-muted mt-1">Where your money lives. Opening balance sets the start, current balance follows every transaction.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-sm">{editing ? "Edit account" : "Add account"}</h2>
          {editing && <Button variant="ghost" onClick={()=>{setEditing(null);setName("");}}>Cancel</Button>}
        </CardHeader>
        <CardBody>
          <form onSubmit={create} className="grid md:grid-cols-[1.2fr_0.8fr_0.8fr_auto] gap-3 items-end">
            <Field label="Name">
              <Input placeholder="HDFC savings" value={name} onChange={e=>setName(e.target.value)} required />
            </Field>
            <Field label="Type">
              <Select value={type} onChange={e=>setType(e.target.value)}><option value="savings">Savings</option><option value="current">Current</option></Select>
            </Field>
            {!editing ? (
              <Field label="Opening balance">
                <Input placeholder="50000" value={bal} onChange={e=>setBal(e.target.value)} required />
              </Field>
            ) : <div />}
            <Button type="submit">{editing?"Update":"Create"}</Button>
          </form>
          {err && <div className="mt-3 rounded-lg border border-vermillion/20 bg-vermillion/5 px-3 py-2 text-sm text-vermillion">{err}</div>}
          {!editing && <p className="mt-2 text-xs text-muted">Enter amount in rupees, for example 12500 or 12500.50. Stored as paise.</p>}
        </CardBody>
      </Card>

      {list.length===0 ? <EmptyState title="No accounts yet" desc="Add a savings or current account to start lending. Deactivated accounts stay in history but cannot be used for new transactions." /> : (
        <LedgerTable>
          <thead><tr><Th>Name</Th><Th>Type</Th><Th align="right">Current balance</Th><Th>Status</Th><Th align="right"></Th></tr></thead>
          <tbody>
            {list.map(a=> (
              <tr key={a.id} className="hover:bg-ink/[0.02] dark:hover:bg-white/[0.03]">
                <Td className="font-medium">{a.name}</Td>
                <Td><Badge tone="neutral">{a.type}</Badge></Td>
                <Td align="right" className="amount font-semibold">{formatRupees(a.currentBalancePaise)}</Td>
                <Td><Badge tone={a.status==="active"?"success":"neutral"}>{a.status}</Badge></Td>
                <Td align="right">
                  <div className="flex justify-end gap-1.5">
                    <Button variant="ghost" onClick={()=>{setEditing(a.id);setName(a.name);setType(a.type);}}>Edit</Button>
                    {a.status==="active" && <Button variant="secondary" onClick={()=>setConfirmId(a.id)}>Deactivate</Button>}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </LedgerTable>
      )}
      <ConfirmDialog open={!!confirmId} title="Deactivate account?" desc="This account will no longer appear as a source for new transactions. History stays intact and is still audited." confirmLabel="Deactivate" tone="danger" onClose={()=>setConfirmId(null)} onConfirm={()=>confirmId && deactivate(confirmId)} />
    </div>
  );
}
