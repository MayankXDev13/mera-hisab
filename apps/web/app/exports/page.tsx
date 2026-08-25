"use client";
import { API_URL } from "../../lib/api";
export default function ExportsPage(){
  return <div style={{padding:24}}>
    <h1>Exports</h1>
    <ul style={{marginTop:16,display:"flex",flexDirection:"column",gap:8}}>
      <li><a href={`${API_URL}/api/v1/exports/transactions.csv`}>Download transactions CSV</a></li>
      <li><a href={`${API_URL}/api/v1/exports/customers.csv`}>Download customers CSV</a></li>
      <li><a href={`${API_URL}/api/v1/exports/charges.csv`}>Download charges CSV</a></li>
    </ul>
    <p style={{marginTop:16}}>PDF statements available on each customer detail page.</p>
  </div>;
}
