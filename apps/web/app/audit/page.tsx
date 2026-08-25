"use client";
import { useEffect, useState, useCallback } from "react";
import { API_URL } from "../../lib/api";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Field";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { FilterBar } from "../components/ui/FilterBar";

type Entry = { id:string; action:string; entityType:string; entityId:string; actorId:string; createdAt:string; before:string|null; after:string|null };

export default function AuditPage(){
  const [list,setList]=useState<Entry[]>([]);
  const [filters,setFilters]=useState({action:"",entityType:"",entityId:"",from:"",to:""});
  const [expanded,setExpanded]=useState<string|null>(null);

  const load = useCallback(async ()=>{
    const q=new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v])=> !!v))).toString();
    const r=await fetch(`${API_URL}/api/v1/audit${q?`?${q}`:""}`,{credentials:"include"});
    if(r.ok){ const j=await r.json() as {data?:Entry[]}|Entry[]; const data = Array.isArray(j) ? j : (j.data ?? []); setList(data); }
  },[filters]);
  useEffect(()=>{ void load(); },[load]);

  function diff(before:string|null, after:string|null){
    if(!before && !after) return "No recorded change.";
    try{
      const b=before?JSON.parse(before) as Record<string,unknown>:{};
      const a=after?JSON.parse(after) as Record<string,unknown>:{};
      const keys=new Set([...Object.keys(b),...Object.keys(a)]);
      const out:string[]=[];
      for(const k of keys){ if(JSON.stringify(b[k])!==JSON.stringify(a[k])) out.push(`${k}: ${JSON.stringify(b[k])} → ${JSON.stringify(a[k])}`); }
      return out.join("\n")||"No field changed.";
    }catch{ return `${before ?? ""} | ${after ?? ""}`;}
  }

  return (
    <div className="space-y-6 pb-16 md:pb-0">
      <div>
        <h1 className="display text-2xl md:text-3xl font-bold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted mt-1">Every change with actor, action, entity and before and after. Filter to investigate an incident fast.</p>
      </div>

      <FilterBar>
        <Input placeholder="Action, for example customer.update" value={filters.action} onChange={e=>setFilters({...filters,action:e.target.value})} className="min-w-[180px]" />
        <Input placeholder="Entity type" value={filters.entityType} onChange={e=>setFilters({...filters,entityType:e.target.value})} className="min-w-[140px]" />
        <Input placeholder="Entity id" value={filters.entityId} onChange={e=>setFilters({...filters,entityId:e.target.value})} className="min-w-[140px]" />
        <Input type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})} />
        <Input type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})} />
        <Button variant="secondary" onClick={load}>Apply</Button>
      </FilterBar>

      {list.length===0 ? <Card><div className="p-8 text-center text-sm text-muted">No entries match the filters.</div></Card> : (
        <div className="space-y-3">
          {list.map(e=> (
            <Card key={e.id} className="overflow-hidden">
              <div className="px-4 py-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="amount text-xs text-muted">{new Date(e.createdAt).toLocaleString("en-IN")}</span>
                <Badge tone="info">{e.action}</Badge>
                <span className="text-muted text-xs">{e.entityType}</span>
                <span className="font-mono text-xs">{e.entityId.slice(0,8)}</span>
                <span className="text-xs text-muted hidden sm:inline">by <span className="font-mono">{e.actorId?.slice(0,6) ?? "—"}</span></span>
                <Button variant="ghost" className="ml-auto h-7 py-1 text-xs" onClick={()=>setExpanded(expanded===e.id?null:e.id)}>{expanded===e.id?"Hide":"Show change"}</Button>
              </div>
              {expanded===e.id && <pre className="mx-4 mb-4 rounded-lg bg-ink text-paper dark:bg-white dark:text-ink p-3 text-xs whitespace-pre-wrap break-words font-mono leading-relaxed">{diff(e.before,e.after)}</pre>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
