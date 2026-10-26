"use client";
import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const emptyCredit={production:"",role_name:"",organization:"",credit_year:""};
const emptyWork={title:"",description:"",media_url:"",media_type:"link"};
export default function TalentProfile(){
 const [user,setUser]=useState(null),[profile,setProfile]=useState(null),[credits,setCredits]=useState([]),[works,setWorks]=useState([]),[credit,setCredit]=useState(emptyCredit),[work,setWork]=useState(emptyWork),[message,setMessage]=useState("Loading..."),[busy,setBusy]=useState(false);
 async function load(id){
  const [p,c,w]=await Promise.all([db.from("profiles").select("*").eq("id",id).maybeSingle(),db.from("professional_credits").select("*").eq("user_id",id).order("created_at",{ascending:false}),db.from("portfolio_items").select("*").eq("user_id",id).order("created_at",{ascending:false})]);
  if(p.error||c.error||w.error){setMessage(p.error?.message||c.error?.message||w.error?.message);return;}
  setProfile(p.data);setCredits(c.data||[]);setWorks(w.data||[]);setMessage("");
 }
 useEffect(()=>{db.auth.getUser().then(({data:{user}})=>{if(!user){setMessage("Please log in on the homepage first.");return;}setUser(user);load(user.id)})},[]);
 const change=(k,v)=>setProfile(p=>({...p,[k]:v}));
 async function save(e){e.preventDefault();setBusy(true);const {error}=await db.from("profiles").update({display_name:profile.display_name,headline:profile.headline,bio:profile.bio,city:profile.city,region:profile.region,country:profile.country,specialties:profile.specialties,website_url:profile.website_url,reel_url:profile.reel_url,visibility:profile.visibility}).eq("id",user.id);setMessage(error?error.message:"Profile saved.");setBusy(false);}
 async function upload(e){const file=e.target.files?.[0];if(!file)return;if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5242880){setMessage("Choose a JPG, PNG or WebP under 5 MB.");return;}setBusy(true);const path=user.id+"/headshot-"+Date.now()+"."+file.name.split(".").pop().toLowerCase();const {error}=await db.storage.from("talent-headshots").upload(path,file,{contentType:file.type});if(error){setMessage(error.message);setBusy(false);return;}const result=await db.from("profiles").update({avatar_path:path}).eq("id",user.id);setMessage(result.error?result.error.message:"Headshot uploaded.");await load(user.id);setBusy(false);}
 async function addCredit(e){e.preventDefault();setBusy(true);const {error}=await db.from("professional_credits").insert({user_id:user.id,production:credit.production,role_name:credit.role_name,organization:credit.organization,credit_year:credit.credit_year?Number(credit.credit_year):null});setMessage(error?error.message:"Credit added.");if(!error)setCredit(emptyCredit);await load(user.id);setBusy(false);}
 async function addWork(e){e.preventDefault();setBusy(true);const {error}=await db.from("portfolio_items").insert({...work,user_id:user.id});setMessage(error?error.message:"Portfolio item added.");if(!error)setWork(emptyWork);await load(user.id);setBusy(false);}
 async function remove(table,id){if(!window.confirm("Delete this item?"))return;const {error}=await db.from(table).delete().eq("id",id).eq("user_id",user.id);setMessage(error?error.message:"Item deleted.");await load(user.id);}
 const input={width:"100%",padding:11,borderRadius:8,border:"1px solid #666",marginTop:5,marginBottom:13,background:"#171717",color:"#fff"};
 const section={padding:24,background:"#171717",border:"1px solid #444",borderRadius:16,marginBottom:22};
 const btn={padding:"12px 18px",border:0,borderRadius:8,background:"#b4ff39",color:"#111",fontWeight:700,cursor:"pointer"};
 const field=(key,label,textarea=false)=><label style={{display:"block"}}>{label}{textarea?<textarea style={input} rows={4} value={profile[key]||""} onChange={e=>change(key,e.target.value)}/>:<input style={input} value={profile[key]||""} onChange={e=>change(key,e.target.value)}/>}</label>;
 if(!user||!profile)return <main style={{padding:40}}><a href="/">← bookIN’</a><p>{message}</p></main>;
 if(profile.account_type!=="talent")return <main style={{padding:40}}><a href="/">← bookIN’</a><p>Professional Talent Profiles are for Talent accounts.</p></main>;
 const photo=profile.avatar_path?db.storage.from("talent-headshots").getPublicUrl(profile.avatar_path).data.publicUrl:null;
 return <main style={{background:"#0b0b0b",color:"white",minHeight:"100vh",padding:"35px 18px",fontFamily:"Arial,sans-serif"}}><div style={{maxWidth:850,margin:"auto"}}>
  <a href="/" style={{color:"#b4ff39"}}>← Back to bookIN’</a><h1>My Talent Profile</h1><p style={{color:"#aaa"}}>Build your professional presence. Only approved profiles set to Public can be discovered.</p>
  {message&&<p role="status" style={{color:"#b4ff39"}}>{message}</p>}
  <section style={section}><h2>Headshot</h2>{photo&&<img src={photo} alt="Your professional headshot" style={{width:150,height:150,objectFit:"cover",borderRadius:12}}/>}<p>JPG, PNG or WebP, maximum 5 MB. Uploaded images have public URLs.</p><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={upload}/></section>
  <section style={section}><h2>Professional Details</h2><form onSubmit={save}>
   {field("display_name","Professional name")}{field("headline","Professional headline")}{field("bio","Biography",true)}{field("city","City")}{field("region","State / Region")}{field("country","Country")}
   <label>Specialties (separate with commas)<input style={input} value={(profile.specialties||[]).join(", ")} onChange={e=>change("specialties",e.target.value.split(",").map(x=>x.trim()).filter(Boolean))}/></label>
   {field("website_url","Website URL")}{field("reel_url","Demo Reel URL")}
   <label>Profile visibility<select style={input} value={profile.visibility||"private"} onChange={e=>change("visibility",e.target.value)}><option value="private">Private</option><option value="public">Public (after approval)</option></select></label>
   <button style={btn} disabled={busy}>Save Profile</button>
  </form></section>
  <section style={section}><h2>Professional Credits</h2>{credits.map(c=><div key={c.id} style={{borderBottom:"1px solid #444",padding:10}}><strong>{c.production}</strong> — {c.role_name}<p>{c.organization} {c.credit_year||""} {c.verified?"✓ Verified":""}</p><button onClick={()=>remove("professional_credits",c.id)}>Remove</button></div>)}
   <h3>Add a credit</h3><form onSubmit={addCredit}>{["production","role_name","organization","credit_year"].map(k=><label key={k} style={{display:"block"}}>{({production:"Production / Project",role_name:"Your Role",organization:"Organization",credit_year:"Year"})[k]}<input style={input} type={k==="credit_year"?"number":"text"} required={k==="production"||k==="role_name"} value={credit[k]} onChange={e=>setCredit({...credit,[k]:e.target.value})}/></label>)}<button style={btn} disabled={busy}>Add Credit</button></form>
  </section>
  <section style={section}><h2>Portfolio</h2>{works.map(w=><div key={w.id} style={{borderBottom:"1px solid #444",padding:10}}><strong>{w.title}</strong><p>{w.description}</p><a href={w.media_url} target="_blank" rel="noopener noreferrer" style={{color:"#b4ff39"}}>View {w.media_type}</a> <button onClick={()=>remove("portfolio_items",w.id)}>Remove</button></div>)}
   <h3>Add a project</h3><form onSubmit={addWork}><label>Title<input style={input} required value={work.title} onChange={e=>setWork({...work,title:e.target.value})}/></label><label>Description<textarea style={input} value={work.description} onChange={e=>setWork({...work,description:e.target.value})}/></label><label>Photo, video or project URL<input style={input} required type="url" value={work.media_url} onChange={e=>setWork({...work,media_url:e.target.value})}/></label><label>Type<select style={input} value={work.media_type} onChange={e=>setWork({...work,media_type:e.target.value})}><option value="link">Link</option><option value="video">Video</option><option value="image">Image</option></select></label><button style={btn} disabled={busy}>Add Project</button></form>
  </section>
 </div></main>;
}