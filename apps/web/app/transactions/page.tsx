"use client";
import { useEffect, useState } from "react";
import { API_URL } from "../../lib/api";
import { formatRupees, rupeesToPaise } from "../../lib/money";
import { Button } from "../components/ui/Button";
import { Input, Select, Field } from "../components/ui/Field";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import { LedgerTable, Th, Td } from "../components/ui/LedgerTable";
import { Badge } from "../components/ui/Badge";
import { FilterBar } from "../components/ui/FilterBar";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

type TxRow = {id:string;direction:string;amountPaise:number;customerId:string;sourceType:string;sourceId:string;occurredAt:string;note:string|null};

export default function TransactionsPage(){
  const [list,setList]=useState<TxRow[]>([]);
  const [accounts,setAccounts]=useState<{id:string;name:string}[]>([]);
  const [cards,setCards]=useState<{id:string;issuer:string;last4:string}[]>([]);
  const [customers,setCustomers]=useState<{id:string;name:string;username:string}[]>([]);
  const [form,setForm]=useState({direction:"debit",customerId:"",sourceType:"account",sourceId:"",amount:"",note:""});
  const [filters,setFilters]=useState({customerId:"",direction:"",from:"",to:""});
  const [err,setErr]=useState(""); const [ok,setOk]=useState(""); const [reverseId,setReverseId]=useState<string|null>(null);

  async function load(){
    const q=new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v])=> !!v))).toString();
    const r=await fetch(`${API_URL}/api/v1/transactions${q?`?${q}`:""}`,{credentials:"include"});
    if(r.ok) setList(await r.json());
  }
  useEffect(()=>{ void load(); fetch(`${API_URL}/api/v1/accounts`,{credentials:"include"}).then(r=>r.json()).then(setAccounts).catch(()=>{}); fetch(`${API_URL}/api/v1/cards`,{credentials:"include"}).then(r=>r.json()).then(setCards).catch(()=>{}); fetch(`${API_URL}/api/v1/customers`,{credentials:"include"}).then(r=>r.json()).then(setCustomers).catch(()=>{}); },[]);

  async function submit(e:React.FormEvent){
    e.preventDefault(); setErr(""); setOk("");
    if(!form.customerId || !form.sourceId || !form.amount) { setErr("Customer, source and amount are required."); return; }
    const res=await fetch(`${API_URL}/api/v1/transactions`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({direction:form.direction,customerId:form.customerId,sourceType:form.sourceType,sourceId:form.sourceId,amountPaise:rupeesToPaise(form.amount),note:form.note||null})});
    if(!res.ok){ const j=await res.json().catch(()=>null) as {message?:string}|null; setErr(j?.message ?? "Could not post transaction. Check card limit and try again."); return; }
    setOk(form.direction==="debit" ? "Disbursement posted. Source balance updated." : "Repayment posted. Outstanding reduced.");
    setForm({...form, amount:"", note:""}); void load();
  }
  async function reverse(id:string){ await fetch(`${API_URL}/api/v1/transactions/${id}/reverse`,{method:"POST",credentials:"include"}); setReverseId(null); void load(); }

  const sourceOptions: Array<{id:string;name?:string;issuer?:string;last4?:string}> = form.sourceType==="account" ? accounts : cards;

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div>
        <h1 className="display text-2xl md:text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted mt-1">Give and receive. Each entry updates the source balance and the customer&apos;s outstanding in one write.</p>
      </div>

      <Card>
        <CardHeader><h2 className="font-semibold text-sm">Post entry</h2><span className="text-xs text-muted">Paise never floats. Amount in rupees.</span></CardHeader>
        <CardBody>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Direction">
                <div className="flex rounded-lg border border-line overflow-hidden">
                  <button type="button" onClick={()=>setForm({...form,direction:"debit"})} className={`flex-1 py-2.5 text-sm font-medium ${form.direction==="debit" ? "bg-vermillion text-white" : "bg-paper text-muted hover:text-ink"}`}>Give (debit)</button>
                  <button type="button" onClick={()=>setForm({...form,direction:"credit"})} className={`flex-1 py-2.5 text-sm font-medium ${form.direction==="credit" ? "bg-teal text-white" : "bg-paper text-muted hover:text-ink"}`}>Receive (credit)</button>
                </div>
              </Field>
              <Field label="Customer">
                <Select value={form.customerId} onChange={e=>setForm({...form,customerId:e.target.value})} required>
                  <option value="">Select customer</option>
                  {customers.map(c=> <option key={c.id} value={c.id}>{c.name} @{c.username}</option>)}
                </Select>
              </Field>
              <Field label="Source type">
                <Select value={form.sourceType} onChange={e=>setForm({...form,sourceType:e.target.value, sourceId:""})}>
                  <option value="account">Bank account</option>
                  <option value="credit_card">Credit card</option>
                </Select>
              </Field>
              <Field label="Source">
                <Select value={form.sourceId} onChange={e=>setForm({...form,sourceId:e.target.value})} required>
                  <option value="">Select source</option>
                  {sourceOptions.map((s)=> <option key={s.id} value={s.id}>{s.name ?? `${s.issuer} ····${s.last4}`}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid md:grid-cols-[220px_1fr_auto] gap-4 items-end">
              <Field label="Amount (rupees)"><Input placeholder="15000" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} required /></Field>
              <Field label="Note"><Input placeholder="What this was for" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} /></Field>
              <Button type="submit">Post entry</Button>
            </div>
          </form>
          {err && <div className="mt-3 rounded-lg border border-vermillion/20 bg-vermillion/5 px-3 py-2.5 text-sm text-vermillion">{err}</div>}
          {ok && <div className="mt-3 rounded-lg border border-teal/20 bg-teal/5 px-3 py-2.5 text-sm text-teal">{ok}</div>}
        </CardBody>
      </Card>

      <FilterBar>
        <Select value={filters.customerId} onChange={e=>setFilters({...filters,customerId:e.target.value})} className="min-w-[160px]">
          <option value="">All customers</option>
          {customers.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={filters.direction} onChange={e=>setFilters({...filters,direction:e.target.value})}>
          <option value="">All directions</option><option value="debit">Give</option><option value="credit">Receive</option>
        </Select>
        <Input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})} />
        <Input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})} />
        <Button variant="secondary" onClick={load}>Apply filters</Button>
      </FilterBar>

      <LedgerTable>
        <thead><tr><Th>Date</Th><Th>Customer</Th><Th>Direction</Th><Th align="right">Amount</Th><Th>Source</Th><Th>Note</Th><Th align="right"></Th></tr></thead>
        <tbody>
          {list.map(t=> (
            <tr key={t.id} className="hover:bg-ink/[0.02] dark:hover:bg-white/[0.03]">
              <Td className="amount text-xs whitespace-nowrap">{t.occurredAt.slice(0,10)}</Td>
              <Td className="text-xs font-mono">{t.customerId.slice(0,6)}</Td>
              <Td><Badge tone={t.direction==="debit"?"danger":"success"}>{t.direction}</Badge></Td>
              <Td align="right" className={`amount font-semibold ${t.direction==="debit"?"text-vermillion":"text-teal"}`}>{formatRupees(t.amountPaise)}</Td>
              <Td className="text-xs"><span className="text-muted">{t.sourceType==="account"?"account":"card"}</span> <span className="font-mono">{t.sourceId.slice(0,6)}</span></Td>
              <Td className="text-sm max-w-[200px] truncate">{t.note ?? "—"}</Td>
              <Td align="right"><Button variant="ghost" onClick={()=>setReverseId(t.id)}>Reverse</Button></Td>
            </tr>
          ))}
          {list.length===0 && <tr><Td colSpan={7}><div className="py-8 text-center text-sm text-muted">No transactions match the filters.</div></Td></tr>}
        </tbody>
      </LedgerTable>
      <ConfirmDialog open={!!reverseId} title="Reverse this entry?" desc="A reversing transaction will be posted. Original stays in the ledger for audit." confirmLabel="Reverse" tone="danger" onClose={()=>setReverseId(null)} onConfirm={()=>reverseId && reverse(reverseId)} />
    </div>
  );
}
