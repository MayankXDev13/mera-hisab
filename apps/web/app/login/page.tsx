"use client";
import { useState } from "react";
import { API_URL } from "../../lib/api";

export default function LoginPage(){
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [err,setErr]=useState("");
  async function submit(e: React.FormEvent){
    e.preventDefault();
    const res=await fetch(`${API_URL}/api/v1/auth/login`,{method:"POST", headers:{"Content-Type":"application/json"}, credentials:"include", body:JSON.stringify({email,password})});
    if(res.ok) window.location.href="/";
    else setErr("Login failed");
  }
  return <div style={{maxWidth:400,margin:"80px auto",padding:24}}>
    <h1>Login</h1>
    <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:12,marginTop:16}}>
      <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      {err && <p style={{color:"red"}}>{err}</p>}
      <button type="submit">Login</button>
    </form>
  </div>;
}
