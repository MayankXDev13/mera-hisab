"use client";
import { useEffect, useState } from "react";
import { API_URL } from "../../../lib/api";
import { formatRupees } from "../../../lib/money";
import { useParams } from "next/navigation";

export default function CustomerDetailPage(){
  const params=useParams() as {id:string};
  const [cust,setCust]=useState<Record<string,unknown>|null>(null);
  const [txs,setTxs]=useState<Record<string,unknown>[]>([]);
  const [charges,setCharges]=useState<Record<string,unknown>[]>([]);
  useEffect(()=>{
    if(!params.id) return;
    fetch(`${API_URL}/api/v1/customers/${params.id}`,{credentials:"include"}).then(r=>r.json()).then(setCust);
    fetch(`${API_URL}/api/v1/transactions?customerId=${params.id}`,{credentials:"include"}).then(r=>r.json()).then(setTxs);
    fetch(`${API_URL}/api/v1/charges?customerId=${params.id}`,{credentials:"include"}).then(r=>r.json()).then(setCharges);
  },[params.id]);
  if(!cust) return <p style={{padding:24}}>Loading...</p>;
  const c=cust as {name:string;username:string;outstandingPaise:number};
  return <div style={{padding:24}}>
    <h1>{c.name} ({c.username})</h1>
    <p>Outstanding: {formatRupees(c.outstandingPaise??0)}</p>
    <h2 style={{marginTop:16}}>Transactions</h2>
    <ul>{txs.map((t:Record<string,unknown>)=> <li key={t.id as string}>{t.occurredAt as string} {t.direction as string} {formatRupees(t.amountPaise as number)} {t.note as string}</li>)}</ul>
    <h2 style={{marginTop:16}}>Charges</h2>
    <ul>{charges.map((ch:Record<string,unknown>)=> <li key={ch.id as string}>{ch.periodMonth as string} {(Number(ch.rateSnapshotBps)/100).toFixed(2)}% base {formatRupees(ch.baseAmountPaise as number)} charge {formatRupees(ch.chargeAmountPaise as number)} [{ch.status as string}] waived {formatRupees(ch.waivedAmountPaise as number)}</li>)}</ul>
    <p><a href={`${API_URL}/api/v1/exports/statement/${params.id}.pdf`}>Download PDF Statement</a></p>
  </div>;
}
