"use client";
import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export default function Admin(){
 const [state,setState]=useState("Loading administrator access..."),[profiles,setProfiles]=useState([]),[busy,setBusy]=useState("");
 async function load(){
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){setState("Please log in to your bookIN’ account first.");return;}
  const {data:admin,error:adminError}=await supabase.from("admin_members").select("user_id").eq("user_id",user.id).maybeSingle();
  if(adminError||!admin){setState("Access denied. This page is for bookIN’ administrators.");return;}
  const {data,error}=await supabase.from("profiles").select("id,display_name,account_type,approval_status,created_at").order("created_at",{ascending:false});
  if(error){setState("Unable to load accounts: "+error.message);return;}
  setProfiles(data||[]);setState("ready");
 }
 useEffect(()=>{load()},[]);
 async function review(id,status){
  if(!["approved","rejected"].includes(status))return;
  setBusy(id);
  const {error}=await supabase.from("profiles").update({approval_status:status}).eq("id",id);
  if(error)alert(error.message);
  await load();setBusy("");
 }
 const pending=profiles.filter(p=>p.approval_status==="pending");
 return <main style={{maxWidth:960,margin:"50px auto",padding:24,fontFamily:"Arial,sans-serif"}}>
  <a href="/" style={{color:"#7ebd28"}}>← bookIN’</a><h1>Admin Dashboard</h1>
  {state!=="ready"?<p role="status">{state}</p>:<>
   <p>Accounts: {profiles.length} · Pending: {pending.length} · Approved: {profiles.filter(p=>p.approval_status==="approved").length}</p>
   <h2>Account reviews</h2>
   {profiles.length===0?<p>No registrations yet.</p>:<div style={{display:"grid",gap:12}}>
    {profiles.map(p=><section key={p.id} style={{border:"1px solid #777",borderRadius:10,padding:16}}>
     <strong>{p.display_name||"Unnamed account"}</strong>
     <p>{p.account_type} · {p.approval_status}</p>
     {p.approval_status==="pending"&&<div style={{display:"flex",gap:10}}>
      <button disabled={busy===p.id} onClick={()=>review(p.id,"approved")}>Approve</button>
      <button disabled={busy===p.id} onClick={()=>review(p.id,"rejected")}>Reject</button>
     </div>}
    </section>)}
   </div>}
  </>}
 </main>
}