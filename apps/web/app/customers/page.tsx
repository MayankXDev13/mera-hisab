"use client";
import { useEffect, useState } from "react";
import { API_URL } from "../../lib/api";
import { formatRupees } from "../../lib/money";
import { Button } from "../components/ui/Button";
import { Input, Field } from "../components/ui/Field";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import { LedgerTable, Th, Td } from "../components/ui/LedgerTable";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { FilterBar } from "../components/ui/FilterBar";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import Link from "next/link";

type Customer = { id:string; name:string; username:string; email:string|null; phone:string|null; monthlyRateBps:number; status:string; outstandingPaise:number };

export default function CustomersPage(){
  const [list,setList]=useState<Customer[]>([]);
  const [q,setQ]=useState("");
  const [form,setForm]=useState({name:"",username:"",email:"",phone:"",notes:"",monthlyRatePct:"2"});
  const [editing,setEditing]=useState<string|null>(null);
  const [err,setErr]=useState(""); const [confirmId,setConfirmId]=useState<string|null>(null);
  const [openForm,setOpenForm]=useState(false);

  async function load(query=q){ const r=await fetch(`${API_URL}/api/v1/customers${query?`?q=${encodeURIComponent(query)}`:""}`,{credentials:"include"}); if(r.ok) setList(await r.json()); }
  useEffect(()=>{void load("");},[]);

  async function submit(e:React.FormEvent){
    e.preventDefault(); setErr("");
    const body={...form, monthlyRatePct: parseFloat(form.monthlyRatePct), email: form.email||null, phone: form.phone||null, notes: form.notes||null};
    const method=editing?"PATCH":"POST"; const url=editing?`${API_URL}/api/v1/customers/${editing}`:`${API_URL}/api/v1/customers`;
    const res=await fetch(url,{method,credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!res.ok){ const j=await res.json().catch(()=>null) as {message?:string}|null; setErr(j?.message ?? "Could not save customer."); return; }
    setEditing(null); setOpenForm(false); setForm({name:"",username:"",email:"",phone:"",notes:"",monthlyRatePct:"2"}); void load(q);
  }
  async function deactivate(id:string){ await fetch(`${API_URL}/api/v1/customers/${id}/deactivate`,{method:"POST",credentials:"include"}); setConfirmId(null); void load(q); }

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="display text-2xl md:text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted mt-1">Borrowers you lend to. Each has a rate and a running outstanding you can verify line by line.</p>
        </div>
        <Button onClick={()=>{ setOpenForm(!openForm); if(openForm){ setEditing(null); setForm({name:"",username:"",email:"",phone:"",notes:"",monthlyRatePct:"2"}); } }}>{openForm?"Close":"Add customer"}</Button>
      </div>

      <FilterBar>
        <div className="flex-1 min-w-[240px]">
          <Input placeholder="Search name, username or email" value={q} onChange={e=>{setQ(e.target.value); void load(e.target.value);}} />
        </div>
        <span className="text-xs text-muted hidden sm:inline">{list.length} customers</span>
      </FilterBar>

      {(openForm || editing) && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-sm">{editing?"Edit customer":"New customer"}</h2>
            <Button variant="ghost" onClick={()=>{setEditing(null); setOpenForm(false); setForm({name:"",username:"",email:"",phone:"",notes:"",monthlyRatePct:"2"});}}>Cancel</Button>
          </CardHeader>
          <CardBody>
            <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
              <Field label="Name"><Input placeholder="Ramesh Kumar" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required /></Field>
              <Field label="Username"><Input placeholder="ramesh_k" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required /></Field>
              <Field label="Email"><Input placeholder="ramesh@example.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></Field>
              <Field label="Phone"><Input placeholder="9876543210" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></Field>
              <Field label="Monthly rate %" hint="Per month, for example 2 or 2.5"><Input placeholder="2" value={form.monthlyRatePct} onChange={e=>setForm({...form,monthlyRatePct:e.target.value})} required /></Field>
              <Field label="Notes"><Input placeholder="Agreed on 1st, compound" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} /></Field>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit">{editing?"Update customer":"Create customer"}</Button>
                <Button type="button" variant="secondary" onClick={()=>{setEditing(null); setOpenForm(false);}}>Cancel</Button>
              </div>
            </form>
            {err && <div className="mt-3 rounded-lg border border-vermillion/20 bg-vermillion/5 px-3 py-2 text-sm text-vermillion">{err}</div>}
          </CardBody>
        </Card>
      )}

      {list.length===0 ? <EmptyState title="No customers yet" desc="Add a borrower with name, username and monthly rate. Outstanding will appear as you post disbursements." /> : (
        <LedgerTable>
          <thead><tr><Th>Customer</Th><Th>Rate</Th><Th align="right">Outstanding</Th><Th>Status</Th><Th align="right"></Th></tr></thead>
          <tbody>
            {list.map(c=> (
              <tr key={c.id} className="hover:bg-ink/[0.02] dark:hover:bg-white/[0.03]">
                <Td>
                  <Link href={`/customers/${c.id}`} className="font-medium hover:text-indigo hover:underline underline-offset-4">{c.name}</Link>
                  <div className="text-xs text-muted">@{c.username} {c.email ? `· ${c.email}` : ""}</div>
                </Td>
                <Td><span className="amount text-sm">{(c.monthlyRateBps/100).toFixed(2)}%</span></Td>
                <Td align="right" className="amount font-semibold">{formatRupees(c.outstandingPaise ?? 0)}</Td>
                <Td><Badge tone={c.status==="active"?"success":"neutral"}>{c.status}</Badge></Td>
                <Td align="right">
                  <div className="flex justify-end gap-1">
                    <Link href={`/customers/${c.id}`} className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo hover:bg-indigo/10">View</Link>
                    <Button variant="ghost" onClick={()=>{setEditing(c.id); setOpenForm(true); setForm({name:c.name,username:c.username,email:c.email??"",phone:c.phone??"",notes:"",monthlyRatePct:String((c.monthlyRateBps/100))})}}>Edit</Button>
                    {c.status==="active" && <Button variant="ghost" onClick={()=>setConfirmId(c.id)}>Deactivate</Button>}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </LedgerTable>
      )}
      <ConfirmDialog open={!!confirmId} title="Deactivate customer?" desc="This borrower will not receive new charges or transactions. History stays intact." confirmLabel="Deactivate" tone="danger" onClose={()=>setConfirmId(null)} onConfirm={()=>confirmId && deactivate(confirmId)} />
    </div>
  );
}
