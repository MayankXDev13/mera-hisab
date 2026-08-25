import { API_URL } from "../lib/api";

export default async function Home(){
  let health="unknown";
  try{ const r=await fetch(`${API_URL}/api/v1/health`,{cache:"no-store"}); const j=await r.json(); health=JSON.stringify(j); }catch(e){ health=String(e); }
  const links=[
    ["/dashboard","Dashboard"],
    ["/accounts","Accounts"],
    ["/cards","Cards"],
    ["/customers","Customers"],
    ["/transactions","Transactions"],
    ["/charges","Charges"],
    ["/audit","Audit Log"],
    ["/exports","Exports"],
    ["/login","Login"],
  ] as const;
  return <div style={{padding:24}}>
    <h1>Mera Hisab</h1>
    <p style={{marginTop:8}}>Health: {health}</p>
    <nav style={{display:"flex",flexWrap:"wrap",gap:12,marginTop:16}}>
      {links.map(([href,label])=> <a key={href} href={href} style={{padding:"8px 12px",border:"1px solid #ccc",borderRadius:6}}>{label}</a>)}
    </nav>
  </div>;
}
