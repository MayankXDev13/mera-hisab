"use client";
import { useEffect, useState } from "react";
import { API_URL } from "../../lib/api";
import { formatRupees, rupeesToPaise } from "../../lib/money";

export default function AccountsPage(){
  const [list,setList]=useState<{id:string;name:string;type:string;openingBalancePaise:number;currentBalancePaise:number;status:string}[]>([]);
  const [name,setName]=useState(""); const [type,setType]=useState("savings"); const [bal,setBal]=useState("");
  const [editing,setEditing]=useState<string|null>(null);
  async function load(){ const r=await fetch(`${API_URL}/api/v1/accounts`,{credentials:"include"}); setList(await r.json()); }
  useEffect(()=>{ load(); },[]);
  async function create(e:React.FormEvent){
    e.preventDefault();
    const method=editing?"PATCH":"POST"; const url=editing?`${API_URL}/api/v1/accounts/${editing}`:`${API_URL}/api/v1/accounts`;
    const body:any=editing?{name,type}:{name,type,openingBalancePaise:rupeesToPaise(bal)};
    await fetch(url,{method,credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    setName(""); setBal(""); setEditing(null); load();
  }
  async function deactivate(id:string){ await fetch(`${API_URL}/api/v1/accounts/${id}/deactivate`,{method:"POST",credentials:"include"}); load(); }
  return <div style={{padding:24}}>
    <h1>Accounts</h1>
    <form onSubmit={create} style={{display:"flex",gap:8,marginTop:12}}>
      <input placeholder="name" value={name} onChange={e=>setName(e.target.value)} />
      <select value={type} onChange={e=>setType(e.target.value)}><option value="savings">savings</option><option value="current">current</option></select>
      {!editing && <input placeholder="opening balance (₹)" value={bal} onChange={e=>setBal(e.target.value)} />}
      <button type="submit">{editing?"Update":"Create"}</button>
      {editing && <button type="button" onClick={()=>{setEditing(null);setName("");}}>Cancel</button>}
    </form>
    <ul style={{marginTop:16}}>
      {list.map(a=> <li key={a.id} style={{display:"flex",gap:12,alignItems:"center"}}>{a.name} [{a.type}] {formatRupees(a.currentBalancePaise)} {a.status} <button onClick={()=>{setEditing(a.id);setName(a.name);setType(a.type);}}>Edit</button> {a.status==="active" && <button onClick={()=>deactivate(a.id)}>Deactivate</button>}</li>)}
    </ul>
  </div>;
}
