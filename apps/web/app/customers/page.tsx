"use client";
import { useEffect, useState } from "react";
import { API_URL } from "../../lib/api";
import { formatRupees } from "../../lib/money";

export default function CustomersPage(){
  const [list,setList]=useState<{id:string;name:string;username:string;email:string;phone:string;monthlyRateBps:number;status:string;outstandingPaise:number}[]>([]);
  const [q,setQ]=useState("");
  const [form,setForm]=useState({name:"",username:"",email:"",phone:"",notes:"",monthlyRatePct:"2"});
  const [editing,setEditing]=useState<string|null>(null);
  async function load(query=q){ const r=await fetch(`${API_URL}/api/v1/customers${query?`?q=${encodeURIComponent(query)}`:""}`,{credentials:"include"}); setList(await r.json()); }
  useEffect(()=>{load("");},[]);
  async function submit(e:React.FormEvent){
    e.preventDefault();
    const body={...form, monthlyRatePct: parseFloat(form.monthlyRatePct), email: form.email||null, phone: form.phone||null, notes: form.notes||null};
    const method=editing?"PATCH":"POST"; const url=editing?`${API_URL}/api/v1/customers/${editing}`:`${API_URL}/api/v1/customers`;
    await fetch(url,{method,credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    setEditing(null); setForm({name:"",username:"",email:"",phone:"",notes:"",monthlyRatePct:"2"}); load(q);
  }
  async function deactivate(id:string){ await fetch(`${API_URL}/api/v1/customers/${id}/deactivate`,{method:"POST",credentials:"include"}); load(q); }
  return <div style={{padding:24}}>
    <h1>Customers</h1>
    <input placeholder="search name/username/email" value={q} onChange={e=>{setQ(e.target.value); load(e.target.value);}} style={{marginTop:12}} />
    <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:8,marginTop:12,maxWidth:480}}>
      <input placeholder="name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
      <input placeholder="username" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} />
      <input placeholder="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
      <input placeholder="phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
      <input placeholder="monthly rate % (e.g. 2.5)" value={form.monthlyRatePct} onChange={e=>setForm({...form,monthlyRatePct:e.target.value})} />
      <input placeholder="notes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} />
      <button type="submit">{editing?"Update":"Create"}</button>
      {editing && <button type="button" onClick={()=>{setEditing(null);setForm({name:"",username:"",email:"",phone:"",notes:"",monthlyRatePct:"2"});}}>Cancel</button>}
    </form>
    <ul style={{marginTop:16}}>
      {list.map(c=> <li key={c.id}><a href={`/customers/${c.id}`}>{c.name} ({c.username})</a> {(c.monthlyRateBps/100).toFixed(2)}% {formatRupees(c.outstandingPaise??0)} [{c.status}] <button onClick={()=>{setEditing(c.id);setForm({name:c.name,username:c.username,email:c.email??"",phone:c.phone??"",notes:"",monthlyRatePct:String((c.monthlyRateBps/100))})}}>Edit</button> {c.status==="active" && <button onClick={()=>deactivate(c.id)}>Deactivate</button>}</li>)}
    </ul>
  </div>;
}
