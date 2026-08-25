export function formatRupees(paise: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(paise/100);
}
export function rupeesToPaise(s: string): number {
  const parts=s.trim().split(".");
  const r=parseInt(parts[0]||"0",10);
  const pStr=(parts[1]??"").padEnd(2,"0").slice(0,2);
  const p=pStr?parseInt(pStr,10):0;
  const sign=s.trim().startsWith("-")?-1:1;
  return sign*(Math.abs(r)*100+p);
}
