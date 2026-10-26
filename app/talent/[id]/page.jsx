"use client";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import {createClient} from "@supabase/supabase-js";
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const platforms=[
 {key:"instagram_url",label:"Instagram",host:"instagram.com",symbol:"◎",color:"#ed4b91"},
 {key:"tiktok_url",label:"TikTok",host:"tiktok.com",symbol:"♪",color:"#ffffff"},
 {key:"youtube_url",label:"YouTube",host:"youtube.com",symbol:"▶",color:"#ff3434"}
];
function socialUrl(value,host){try{const u=new URL(value);return u.protocol==="https:"&&(u.hostname===host||u.hostname==="www."+host)?u.href:null}catch{return null}}
export default function PublicTalentProfile(){
 const {id}=useParams(),[activeTab,setActiveTab]=useState("about"),[profile,setProfile]=useState(null),[credits,setCredits]=useState([]),[photos,setPhotos]=useState([]),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;(async()=>{
  const {data:p}=await db.from("profiles").select("*").eq("id",id).eq("account_type","talent").eq("visibility","public").eq("approval_status","approved").maybeSingle();
  if(!active)return;
  if(p){setProfile(p);const [c,w]=await Promise.all([db.from("professional_credits").select("*").eq("user_id",id).order("created_at",{ascending:false}),db.from("portfolio_items").select("*").eq("user_id",id).eq("media_type","image").order("created_at",{ascending:false})]);if(active){setCredits(c.data||[]);setPhotos(w.data||[]);}}
  setLoading(false);
 })();return()=>{active=false}},[id]);
 const panel={background:"#171717",border:"1px solid #333",borderRadius:16,padding:24,marginTop:22};
 if(loading)return <main style={{background:"#0b0b0b",color:"#fff",minHeight:"100vh",padding:40}}>Loading talent profile...</main>;
 if(!profile)return <main style={{background:"#0b0b0b",color:"#fff",minHeight:"100vh",padding:40}}><a href="/" style={{color:"#b4ff39"}}>← bookIN’</a><h1>Profile unavailable</h1><p>This talent profile is not public or has not been approved.</p></main>;
 const headshot=profile.avatar_path?db.storage.from("talent-headshots").getPublicUrl(profile.avatar_path).data.publicUrl:null;
 return <main style={{background:"#0b0b0b",color:"#fff",minHeight:"100vh",padding:"36px 18px",fontFamily:"Arial,sans-serif"}}><div style={{maxWidth:960,margin:"auto"}}>
 <a href="/" style={{color:"#b4ff39"}}>← bookIN’</a>
 <section style={{...panel,display:"flex",flexWrap:"wrap",alignItems:"center",gap:24}}>
 {headshot&&<img src={headshot} alt={profile.display_name||"Talent"} style={{width:145,height:145,borderRadius:18,objectFit:"cover"}}/>}
 <div style={{flex:1,minWidth:240}}><h1 style={{marginBottom:8}}>{profile.display_name||"Talent"}</h1><p style={{fontSize:19,color:"#b4ff39"}}>{profile.headline||""}</p><p style={{color:"#bbb"}}>{[profile.city,profile.region,profile.country].filter(Boolean).join(", ")}</p>
 <nav aria-label="Social media profiles" style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:16}}>
 {platforms.map(x=>{const url=socialUrl(profile[x.key],x.host);return url?<a key={x.key} href={url} target="_blank" rel="noopener noreferrer" aria-label={"Visit "+x.label+" profile"} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 13px",border:"1px solid #444",borderRadius:12,color:"#fff",textDecoration:"none",fontWeight:700}}><span aria-hidden="true" style={{color:x.color,fontSize:23,lineHeight:1}}>{x.symbol}</span>{x.label}</a>:null})}
 </nav></div></section>
 <nav role="tablist" aria-label="Profile sections" style={{display:"flex",overflowX:"auto",borderBottom:"1px solid #444",marginTop:24}}>{["About","Portfolio","Credits","Socials"].map(t=><button key={t} role="tab" aria-selected={activeTab===t.toLowerCase()} onClick={()=>setActiveTab(t.toLowerCase())} style={{padding:"18px 22px",background:"transparent",border:0,borderBottom:activeTab===t.toLowerCase()?"3px solid #c6ff53":"3px solid transparent",color:activeTab===t.toLowerCase()?"#c6ff53":"#ddd",fontWeight:800,cursor:"pointer"}}>{t.toUpperCase()}</button>)}</nav>
 {activeTab==="about"&&<section style={panel}><h2>About</h2><p style={{lineHeight:1.7,whiteSpace:"pre-wrap"}}>{profile.bio||"Biography coming soon."}</p>{!!profile.specialties?.length&&<><h3>Specialties</h3><p>{profile.specialties.join(" · ")}</p></>}</section>}
 {activeTab==="portfolio"&&<section style={panel}><h2>Portfolio Photos</h2>{photos.length?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:12}}>{photos.map(p=><img key={p.id} src={p.media_url} alt={p.title||"Portfolio photo"} loading="lazy" style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:10}}/>)}</div>:<p>No portfolio photos yet.</p>}</section>}
 {activeTab==="credits"&&<section style={panel}><h2>Professional Credits</h2>{credits.length?credits.map(c=><div key={c.id} style={{padding:"12px 0",borderBottom:"1px solid #333"}}><strong>{c.production}</strong><p style={{color:"#ccc"}}>{c.role_name}{c.organization?" · "+c.organization:""}{c.credit_year?" · "+c.credit_year:""}</p></div>):<p>No credits yet.</p>}</section>}
 {activeTab==="socials"&&<section style={panel}><h2>Social Media</h2><div style={{display:"flex",gap:12,flexWrap:"wrap"}}>{platforms.map(x=>{const url=socialUrl(profile[x.key],x.host);return url?<a key={x.key} href={url} target="_blank" rel="noopener noreferrer" style={{padding:"15px 20px",border:"1px solid #555",borderRadius:10,color:"#fff",fontWeight:800}}><span style={{color:x.color,fontSize:24,marginRight:8}}>{x.symbol}</span>{x.label}</a>:null})}</div></section>}
 </div></main>
}