"use client";
import { useEffect, useState } from "react";
import { API_URL } from "../../lib/api";

export default function AuditPage(){
  const [list,setList]=useState<{id:string;action:string;entityType:string;entityId:string;actorId:string;createdAt:string;before:string|null;after:string|null}[]>([]);
  const [filters,setFilters]=useState({action:"",entityType:"",entityId:"",from:"",to:""});
  const [expanded,setExpanded]=useState<string|null>(null);
  async function load(){
    const q=new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v])=> !!v))).toString();
    const r=await fetch(`${API_URL}/api/v1/audit${q?`?${q}`:""}`,{credentials:"include"}); const j=await r.json(); setList(j.data);
  }
  useEffect(()=>{load();},[]);
  function diff(before:string|null, after:string|null){
    if(!before && !after) return "—";
    try{
      const b=before?JSON.parse(before):{}; const a=after?JSON.parse(after):{};
      const keys=new Set([...Object.keys(b),...Object.keys(a)]);
      const out:string[]=[];
      for(const k of keys){ if(JSON.stringify(b[k])!==JSON.stringify(a[k])) out.push(`${k}: ${JSON.stringify(b[k])} → ${JSON.stringify(a[k])}`); }
      return out.join("\n")||"no diff";
    }catch{ return `${before} | ${after}`;}
  }
  return <div style={{padding:24}}>
    <h1>Audit Log</h1>
    <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
      <input placeholder="action" value={filters.action} onChange={e=>setFilters({...filters,action:e.target.value})} />
      <input placeholder="entityType" value={filters.entityType} onChange={e=>setFilters({...filters,entityType:e.target.value})} />
      <input placeholder="entityId" value={filters.entityId} onChange={e=>setFilters({...filters,entityId:e.target.value})} />
      <input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})} />
      <input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})} />
      <button onClick={load}>Filter</button>
    </div>
    <ul style={{marginTop:16}}>
      {list.map(e=> <li key={e.id} style={{border:"1px solid #eee",padding:8,marginBottom:8}}>
        <div>{e.createdAt} {e.action} {e.entityType}:{e.entityId.slice(0,8)} actor:{e.actorId?.slice(0,6)??"-"} <button onClick={()=>setExpanded(expanded===e.id?null:e.id)}>{expanded===e.id?"Collapse":"Expand"}</button></div>
        {expanded===e.id && <pre style={{background:"#f6f6f6",padding:8,marginTop:8,whiteSpace:"pre-wrap",fontSize:12}}>{diff(e.before,e.after)}</pre>}
      </li>)}
    </ul>
  </div>;
}
