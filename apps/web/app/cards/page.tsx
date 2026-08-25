"use client";
import { useEffect, useState } from "react";
import { API_URL } from "../../lib/api";
import { formatRupees, rupeesToPaise } from "../../lib/money";

export default function CardsPage(){
  const [list,setList]=useState<{id:string;issuer:string;last4:string;totalLimitPaise:number;usedPaise:number;availablePaise:number;status:string}[]>([]);
  const [issuer,setIssuer]=useState(""); const [last4,setLast4]=useState(""); const [limit,setLimit]=useState("");
  const [editing,setEditing]=useState<string|null>(null);
  async function load(){ const r=await fetch(`${API_URL}/api/v1/cards`,{credentials:"include"}); setList(await r.json()); }
  useEffect(()=>{load();},[]);
  async function submit(e:React.FormEvent){
    e.preventDefault();
    const method=editing?"PATCH":"POST"; const url=editing?`${API_URL}/api/v1/cards/${editing}`:`${API_URL}/api/v1/cards`;
    const body:any=editing?{issuer,last4}:{issuer,last4,totalLimitPaise:rupeesToPaise(limit)};
    if(editing && limit) body.totalLimitPaise=rupeesToPaise(limit);
    await fetch(url,{method,credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    setIssuer("");setLast4("");setLimit("");setEditing(null);load();
  }
  async function deactivate(id:string){ await fetch(`${API_URL}/api/v1/cards/${id}/deactivate`,{method:"POST",credentials:"include"}); load(); }
  return <div style={{padding:24}}>
    <h1>Cards</h1>
    <form onSubmit={submit} style={{display:"flex",gap:8,marginTop:12}}>
      <input placeholder="issuer" value={issuer} onChange={e=>setIssuer(e.target.value)} />
      <input placeholder="last4" value={last4} onChange={e=>setLast4(e.target.value)} />
      <input placeholder="limit (₹)" value={limit} onChange={e=>setLimit(e.target.value)} />
      <button type="submit">{editing?"Update":"Create"}</button>
      {editing && <button type="button" onClick={()=>{setEditing(null);setIssuer("");setLast4("");}}>Cancel</button>}
    </form>
    <ul style={{marginTop:16}}>
      {list.map(c=> <li key={c.id}>{c.issuer} *{c.last4} limit {formatRupees(c.totalLimitPaise)} used {formatRupees(c.usedPaise)} avail {formatRupees(c.availablePaise)} [{c.status}] <button onClick={()=>{setEditing(c.id);setIssuer(c.issuer);setLast4(c.last4);}}>Edit</button> {c.status==="active" && <button onClick={()=>deactivate(c.id)}>Deactivate</button>}</li>)}
    </ul>
  </div>;
}
