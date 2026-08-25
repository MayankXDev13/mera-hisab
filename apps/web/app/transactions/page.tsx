"use client";
import { useEffect, useState } from "react";
import { API_URL } from "../../lib/api";
import { formatRupees, rupeesToPaise } from "../../lib/money";

export default function TransactionsPage(){
  const [list,setList]=useState<{id:string;direction:string;amountPaise:number;customerId:string;sourceType:string;sourceId:string;occurredAt:string;note:string}[]>([]);
  const [accounts,setAccounts]=useState<{id:string;name:string}[]>([]);
  const [cards,setCards]=useState<{id:string;issuer:string;last4:string}[]>([]);
  const [customers,setCustomers]=useState<{id:string;name:string;username:string}[]>([]);
  const [form,setForm]=useState({direction:"debit",customerId:"",sourceType:"account",sourceId:"",amount:"",note:""});
  const [filters,setFilters]=useState({customerId:"",direction:"",from:"",to:""});
  async function load(){
    const q=new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v])=> !!v))).toString();
    const r=await fetch(`${API_URL}/api/v1/transactions${q?`?${q}`:""}`,{credentials:"include"}); setList(await r.json());
  }
  useEffect(()=>{ load(); fetch(`${API_URL}/api/v1/accounts`,{credentials:"include"}).then(r=>r.json()).then(setAccounts); fetch(`${API_URL}/api/v1/cards`,{credentials:"include"}).then(r=>r.json()).then(setCards); fetch(`${API_URL}/api/v1/customers`,{credentials:"include"}).then(r=>r.json()).then(setCustomers); },[]);
  async function submit(e:React.FormEvent){
    e.preventDefault();
    await fetch(`${API_URL}/api/v1/transactions`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({direction:form.direction,customerId:form.customerId,sourceType:form.sourceType,sourceId:form.sourceId,amountPaise:rupeesToPaise(form.amount),note:form.note||null})});
    load();
  }
  async function reverse(id:string){ await fetch(`${API_URL}/api/v1/transactions/${id}/reverse`,{method:"POST",credentials:"include"}); load(); }
  return <div style={{padding:24}}>
    <h1>Transactions</h1>
    <form onSubmit={submit} style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:12}}>
      <select value={form.direction} onChange={e=>setForm({...form,direction:e.target.value})}><option value="debit">debit (give)</option><option value="credit">credit (receive)</option></select>
      <select value={form.customerId} onChange={e=>setForm({...form,customerId:e.target.value})}><option value="">customer</option>{customers.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select value={form.sourceType} onChange={e=>setForm({...form,sourceType:e.target.value})}><option value="account">account</option><option value="credit_card">card</option></select>
      <select value={form.sourceId} onChange={e=>setForm({...form,sourceId:e.target.value})}><option value="">source</option>{(form.sourceType==="account"?accounts:cards).map((s:Record<string,string>)=> <option key={s.id} value={s.id}>{s.name ?? `${s.issuer} *${s.last4}`}</option>)}</select>
      <input placeholder="amount (₹)" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} />
      <input placeholder="note" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} />
      <button type="submit">Post</button>
    </form>
    <div style={{display:"flex",gap:8,marginTop:12}}>
      <input placeholder="customerId filter" value={filters.customerId} onChange={e=>setFilters({...filters,customerId:e.target.value})} />
      <select value={filters.direction} onChange={e=>setFilters({...filters,direction:e.target.value})}><option value="">all</option><option value="debit">debit</option><option value="credit">credit</option></select>
      <input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})} />
      <input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})} />
      <button onClick={load}>Filter</button>
    </div>
    <ul style={{marginTop:16}}>
      {list.map(t=> <li key={t.id}>{t.occurredAt.slice(0,10)} {t.direction} {formatRupees(t.amountPaise)} cust:{t.customerId.slice(0,6)} src:{t.sourceType}:{t.sourceId.slice(0,6)} {t.note} <button onClick={()=>reverse(t.id)}>Reverse</button></li>)}
    </ul>
  </div>;
}
