"use client";
import { useEffect, useState } from "react";
import { API_URL } from "../../lib/api";
import { formatRupees } from "../../lib/money";

export default function DashboardPage(){
  const [data,setData]=useState<Record<string,unknown>|null>(null);
  const [err,setErr]=useState("");
  useEffect(()=>{ fetch(`${API_URL}/api/v1/dashboard`,{credentials:"include"}).then(r=>r.json()).then(setData).catch(e=>setErr(String(e))); },[]);
  if(err) return <p>{err}</p>;
  if(!data) return <p>Loading...</p>;
  const d=data as { totals:{totalDisbursed:number;totalReceived:number;totalCharges:number;totalWaived:number;outstanding:number}; accounts: {id:string;name:string;currentBalancePaise:number}[]; cards:{id:string;issuer:string;last4:string;totalLimitPaise:number;usedPaise:number;availablePaise:number}[]; customers:{id:string;name:string;username:string;outstandingPaise:number}[] };
  return <div style={{padding:24}}>
    <h1>Dashboard</h1>
    <div style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:16}}>
      <div>Disbursed: {formatRupees(d.totals.totalDisbursed)}</div>
      <div>Received: {formatRupees(d.totals.totalReceived)}</div>
      <div>Charges: {formatRupees(d.totals.totalCharges)}</div>
      <div>Waived: {formatRupees(d.totals.totalWaived)}</div>
      <div><strong>Outstanding: {formatRupees(d.totals.outstanding)}</strong></div>
    </div>
    <h2 style={{marginTop:24}}>Accounts</h2>
    {d.accounts.length===0?<p>No accounts</p>:<ul>{d.accounts.map(a=> <li key={a.id}>{a.name}: {formatRupees(a.currentBalancePaise)}</li>)}</ul>}
    <h2>Cards</h2>
    {d.cards.length===0?<p>No cards</p>:<ul>{d.cards.map(c=> <li key={c.id}>{c.issuer} *{c.last4} limit {formatRupees(c.totalLimitPaise)} used {formatRupees(c.usedPaise)} avail {formatRupees(c.availablePaise)}</li>)}</ul>}
    <h2>Customers by outstanding</h2>
    <ul>{d.customers.map(c=> <li key={c.id}><a href={`/customers/${c.id}`}>{c.name} ({c.username})</a>: {formatRupees(c.outstandingPaise)}</li>)}</ul>
  </div>;
}
