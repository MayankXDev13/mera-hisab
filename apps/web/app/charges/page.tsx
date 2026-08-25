"use client";
import { useEffect, useState } from "react";
import { API_URL } from "../../lib/api";
import { formatRupees, rupeesToPaise } from "../../lib/money";

export default function ChargesPage(){
  const [list,setList]=useState<{id:string;customerId:string;periodMonth:string;rateSnapshotBps:number;baseAmountPaise:number;chargeAmountPaise:number;status:string;waivedAmountPaise:number}[]>([]);
  const [reduceAmt,setReduceAmt]=useState<Record<string,string>>({});
  async function load(){ const r=await fetch(`${API_URL}/api/v1/charges`,{credentials:"include"}); setList(await r.json()); }
  useEffect(()=>{load();},[]);
  async function run(){ if(!confirm("Run monthly charges for now?")) return; await fetch(`${API_URL}/api/v1/charges/run`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({})}); load(); }
  async function waive(id:string, amount?:string){
    const amtStr=amount??"";
    const msg=amtStr?`Reduce by ₹${amtStr}? This posts a reversing adjustment.`:`Waive entire charge? This posts a reversing adjustment.`;
    if(!confirm(msg)) return;
    const body=amtStr?{amountPaise:rupeesToPaise(amtStr)}:{};
    await fetch(`${API_URL}/api/v1/charges/${id}/waive`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    load();
  }
  const grouped:Record<string,typeof list>={};
  for(const c of list){ const arr=grouped[c.periodMonth] ?? []; arr.push(c); grouped[c.periodMonth]=arr; }
  return <div style={{padding:24}}>
    <h1>Charges</h1>
    <button onClick={run} style={{marginTop:12}}>Run charges (manual trigger)</button>
    {Object.keys(grouped).sort().reverse().map(month=> <div key={month} style={{marginTop:16}}>
      <h3>{month}</h3>
      <ul>{(grouped[month] ?? []).map(c=> <li key={c.id} style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>{c.customerId.slice(0,6)} {(c.rateSnapshotBps/100).toFixed(2)}% base {formatRupees(c.baseAmountPaise)} charge {formatRupees(c.chargeAmountPaise)} [{c.status}] waived {formatRupees(c.waivedAmountPaise)}
        {c.status!=="waived" && <><button onClick={()=>waive(c.id)}>Waive all</button><input placeholder="reduce ₹" value={reduceAmt[c.id]??""} onChange={e=>setReduceAmt({...reduceAmt,[c.id]:e.target.value})} style={{width:100}} /><button onClick={()=>waive(c.id, reduceAmt[c.id])}>Reduce</button></>}
      </li>)}</ul>
    </div>)}
  </div>;
}
