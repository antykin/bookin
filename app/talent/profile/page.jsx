"use client";
import {useEffect,useState} from "react";
import {createClient} from "@supabase/supabase-js";
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const creditCategories=["Television & Live Shows","Music Videos","Tours","Dance Teams","Commercials","Residencies","College Dance Teams","Film","Other"];
const emptyCredit={production:"",role_name:"",organization:"",credit_year:"",category:"Other"};

export default function TalentProfile(){
 const [dashboardTab,setDashboardTab]=useState("overview"),[resumeCredits,setResumeCredits]=useState([]),[resumeBusy,setResumeBusy]=useState(false),[user,setUser]=useState(null),[profile,setProfile]=useState(null),[credits,setCredits]=useState([]),[selectedCreditIds,setSelectedCreditIds]=useState([]),[works,setWorks]=useState([]),[credit,setCredit]=useState(emptyCredit),[message,setMessage]=useState("Loading..."),[busy,setBusy]=useState(false);
 async function load(id){
  const [p,c,w]=await Promise.all([db.from("profiles").select("*").eq("id",id).maybeSingle(),db.from("professional_credits").select("*").eq("user_id",id).order("created_at",{ascending:false}),db.from("portfolio_items").select("*").eq("user_id",id).order("created_at",{ascending:false})]);
  if(p.error||c.error||w.error){setMessage(p.error?.message||c.error?.message||w.error?.message);return;}
  setProfile(p.data);setCredits(c.data||[]);setSelectedCreditIds(current=>current.filter(id=>(c.data||[]).some(item=>item.id===id)));setWorks(w.data||[]);setMessage("");
 }
 useEffect(()=>{db.auth.getUser().then(({data:{user}})=>{if(!user){setMessage("Please log in on the homepage first.");return;}setUser(user);load(user.id)})},[]);
 const change=(k,v)=>setProfile(p=>({...p,[k]:v}));
 async function save(e){e.preventDefault();setBusy(true);const {error}=await db.from("profiles").update({display_name:profile.display_name,headline:profile.headline,bio:profile.bio,city:profile.city,region:profile.region,country:profile.country,specialties:profile.specialties,website_url:profile.website_url,reel_url:profile.reel_url,instagram_url:profile.instagram_url||null,tiktok_url:profile.tiktok_url||null,youtube_url:profile.youtube_url||null,visibility:profile.visibility}).eq("id",user.id);setMessage(error?error.message:"Profile saved.");setBusy(false);}
 async function upload(e){const file=e.target.files?.[0];if(!file)return;if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>5242880){setMessage("Choose a JPG, PNG or WebP under 5 MB.");return;}setBusy(true);const path=user.id+"/headshot-"+Date.now()+"."+file.name.split(".").pop().toLowerCase();const {error}=await db.storage.from("talent-headshots").upload(path,file,{contentType:file.type});if(error){setMessage(error.message);setBusy(false);return;}const result=await db.from("profiles").update({avatar_path:path}).eq("id",user.id);setMessage(result.error?result.error.message:"Headshot uploaded.");await load(user.id);setBusy(false);}
 async function parseResume(e){
  const file=e.target.files?.[0];if(!file)return;
  setResumeBusy(true);setMessage("Reading résumé...");setResumeCredits([]);
  try{
   const {data:{session}}=await db.auth.getSession();
   if(!session)throw new Error("Please log in again.");
   const form=new FormData();form.append("file",file);
   const response=await fetch("/api/resume/parse",{method:"POST",headers:{Authorization:"Bearer "+session.access_token},body:form});
   const data=await response.json();if(!response.ok)throw new Error(data.error||"Unable to read résumé.");
   setResumeCredits(data.credits||[]);setMessage(data.credits?.length?"PDF read successfully. Review suggested credits below before importing.":"PDF received and read, but no credits were recognized. This layout needs AI parsing or manual corrections.");
  }catch(error){setMessage(error.message);}finally{setResumeBusy(false);e.target.value="";}
 }
 async function importResume(){
  const valid=resumeCredits.filter(c=>c.production.trim()&&c.role_name.trim());
  if(!valid.length){setMessage("No complete credits to import.");return;}
  setResumeBusy(true);
  const rows=valid.map(c=>({user_id:user.id,production:c.production.trim(),role_name:c.role_name.trim(),organization:c.organization||"",credit_year:c.credit_year?Number(c.credit_year):null,category:creditCategories.includes(c.category)?c.category:"Other"}));
  const {error}=await db.from("professional_credits").insert(rows);
  if(error)setMessage(error.message);else{setMessage(rows.length+" credits imported.");setResumeCredits([]);}
  await load(user.id);setResumeBusy(false);if(!error)setMessage(rows.length+" credits imported.");
 }
 async function addCredit(e){e.preventDefault();setBusy(true);const {error}=await db.from("professional_credits").insert({user_id:user.id,production:credit.production,role_name:credit.role_name,organization:credit.organization,credit_year:credit.credit_year?Number(credit.credit_year):null,category:credit.category});setMessage(error?error.message:"Credit added.");if(!error)setCredit(emptyCredit);await load(user.id);setBusy(false);}
 async function removeSelectedCredits(){const ids=selectedCreditIds.filter(id=>credits.some(c=>c.id===id));if(!ids.length)return;if(!window.confirm("Permanently remove "+ids.length+" selected résumé credit"+(ids.length===1?"":"s")+"? This cannot be undone."))return;setBusy(true);const {error}=await db.from("professional_credits").delete().eq("user_id",user.id).in("id",ids);if(error){setMessage(error.message);}else{setSelectedCreditIds([]);await load(user.id);setMessage(ids.length+" résumé credit"+(ids.length===1?"":"s")+" removed.");}setBusy(false);}
 async function uploadPortfolio(e){
  const files=Array.from(e.target.files||[]);if(!files.length)return;
  setBusy(true);let added=0;let errors=[];
  for(const file of files){
   const isImage=["image/jpeg","image/png","image/webp","image/gif"].includes(file.type);

   if(!isImage){errors.push(file.name+": unsupported format");continue;}
   if(file.size>10*1024*1024){errors.push(file.name+": maximum 10 MB");continue;}
   const ext=file.name.split(".").pop().toLowerCase();
   const path=user.id+"/"+crypto.randomUUID()+"."+ext;
   const {error:uploadError}=await db.storage.from("talent-portfolio").upload(path,file,{contentType:file.type});
   if(uploadError){errors.push(file.name+": "+uploadError.message);continue;}
   const url=db.storage.from("talent-portfolio").getPublicUrl(path).data.publicUrl;
   const {error:insertError}=await db.from("portfolio_items").insert({user_id:user.id,title:file.name.replace(/\.[^.]+$/,"").replace(/[_-]/g," "),description:"",media_url:url,media_type:"image"});
   if(insertError){await db.storage.from("talent-portfolio").remove([path]);errors.push(file.name+": "+insertError.message);}else added++;
  }
  await load(user.id);setMessage(added+" file(s) added to My Portfolio."+(errors.length?" Issues: "+errors.join("; "):""));setBusy(false);e.target.value="";
 }
 async function remove(table,id){if(!window.confirm("Delete this item?"))return;const {error}=await db.from(table).delete().eq("id",id).eq("user_id",user.id);setMessage(error?error.message:"Item deleted.");await load(user.id);}
 const input={width:"100%",padding:11,borderRadius:8,border:"1px solid #666",marginTop:5,marginBottom:13,background:"#171717",color:"#fff"};
 const section={padding:24,background:"#171717",border:"1px solid #444",borderRadius:16,marginBottom:22};
 const btn={padding:"12px 18px",border:0,borderRadius:8,background:"#b4ff39",color:"#111",fontWeight:700,cursor:"pointer"};
 const field=(key,label,textarea=false)=><label style={{display:"block"}}>{label}{textarea?<textarea style={input} rows={4} value={profile[key]||""} onChange={e=>change(key,e.target.value)}/>:<input style={input} value={profile[key]||""} onChange={e=>change(key,e.target.value)}/>}</label>;
 if(!user||!profile)return <main style={{padding:40}}><a href="/">← bookIN’</a><p>{message}</p></main>;
 if(profile.account_type!=="talent")return <main style={{padding:40}}><a href="/">← bookIN’</a><p>Professional Talent Profiles are for Talent accounts.</p></main>;
 const photo=profile.avatar_path?db.storage.from("talent-headshots").getPublicUrl(profile.avatar_path).data.publicUrl:null;
 return <main className="member-studio"><div className="member-shell">
 <aside className="member-sidebar"><a className="member-brand" href="/">book<span>IN’</span></a><div className="member-sidebar-label">TALENT STUDIO</div>
 <nav aria-label="Member dashboard">{[["overview","⌂","Dashboard"],["profile","◉","My Profile"],["credits","▤","Resume & Credits"],["portfolio","▦","Portfolio & Socials"]].map(([key,icon,label])=><button type="button" key={key} className={"member-nav-item"+(dashboardTab===key?" is-active":"")} onClick={()=>setDashboardTab(key)}><span aria-hidden="true">{icon}</span>{label}</button>)}</nav>
 <div className="member-sidebar-bottom"><a href={"/talent/"+user.id} target="_blank" rel="noopener noreferrer">↗ View Public Profile</a><a href="/">← Back to bookIN’</a></div></aside>
 <div className="member-content"><header className="member-topbar"><div><span className="member-eyebrow">CREATOR STUDIO</span><h1>{({overview:"Dashboard",profile:"My Profile",credits:"Resume & Credits",portfolio:"Portfolio & Socials"})[dashboardTab]}</h1></div><div className="member-account"><span className="member-account-avatar">{(profile.display_name||"T").slice(0,1).toUpperCase()}</span><div><strong>{profile.display_name||"Talent Member"}</strong><small>Talent account</small></div></div></header>
 {message&&<p role="status" className="member-status">{message}</p>}
 {dashboardTab==="overview"&&<><section className="member-welcome"><span className="member-eyebrow">WELCOME TO YOUR STUDIO</span><h2>Make your next booking happen.</h2><p>Manage your professional profile, highlight your work, and keep your credits organized — all in one place.</p><button type="button" onClick={()=>setDashboardTab("profile")}>Edit my profile →</button></section>
 <div className="member-stats"><div><small>Professional credits</small><strong>{credits.length}</strong><span>Added to your résumé</span></div><div><small>Portfolio photos</small><strong>{works.filter(w=>w.media_type==="image").length}</strong><span>Showcasing your work</span></div><div><small>Profile status</small><strong className="member-stat-status">{profile.visibility==="public"&&profile.approval_status==="approved"?"Live":profile.approval_status==="pending"?"Pending":"Private"}</strong><span>{profile.visibility==="public"?"Public visibility selected":"Not publicly visible"}</span></div></div>
 <section className="member-card"><h2>Quick actions</h2><div className="member-actions">{[["Update profile","Change your bio, headshot and professional details","profile"],["Manage résumé","Import, categorize or bulk remove credits","credits"],["Add portfolio photos","Show clients your best work","portfolio"]].map(([title,description,key])=><button type="button" key={key} onClick={()=>setDashboardTab(key)}><strong>{title} →</strong><span>{description}</span></button>)}</div></section>
 <section className="member-card"><h2>Public profile</h2><p>See how clients experience your page and booking request form.</p><a className="member-view-link" href={"/talent/"+user.id} target="_blank" rel="noopener noreferrer">Preview public profile ↗</a></section></>}
 {dashboardTab==="profile"&&<>  <section style={section}><h2>Headshot</h2>{photo&&<img src={photo} alt="Your professional headshot" style={{width:150,height:150,objectFit:"cover",borderRadius:12}}/>}<p>JPG, PNG or WebP, maximum 5 MB. Uploaded images have public URLs.</p><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={upload}/></section>
  <section style={section}><h2>Professional Details</h2><form onSubmit={save}>
   {field("display_name","Professional name")}{field("headline","Professional headline")}{field("bio","Biography",true)}{field("city","City")}{field("region","State / Region")}{field("country","Country")}
   <label>Specialties (separate with commas)<input style={input} value={(profile.specialties||[]).join(", ")} onChange={e=>change("specialties",e.target.value.split(",").map(x=>x.trim()).filter(Boolean))}/></label>
   {field("website_url","Website URL")}{field("reel_url","Demo Reel URL")}
   <label>Profile visibility<select style={input} value={profile.visibility||"private"} onChange={e=>change("visibility",e.target.value)}><option value="private">Private</option><option value="public">Public (after approval)</option></select></label>
   <button style={btn} disabled={busy}>Save Profile</button>
  </form></section>
 </>}
 {dashboardTab==="credits"&&<>  <section style={section}><h2>Professional Credits</h2><div style={{padding:16,border:"1px solid #666",borderRadius:12,marginBottom:20}}>
   <h3>Upload your résumé</h3><p>PDF, Word (.docx), or TXT up to 5 MB. We'll suggest credits automatically. Your résumé is processed for extraction and is not stored by this feature.</p>
   <input type="file" accept=".pdf,.docx,.txt" disabled={resumeBusy} onChange={parseResume}/>
   {resumeBusy&&<p>Processing résumé...</p>}
   {resumeCredits.length>0&&<div><h3>Review {resumeCredits.length} suggested credits</h3><p>Edit or remove any mistakes before adding them to your profile. Imported credits are not marked verified.</p>
    {resumeCredits.map((c,i)=><div key={i} style={{borderTop:"1px solid #555",paddingTop:12}}>
     <label>Category<select style={input} value={creditCategories.includes(c.category)?c.category:"Other"} onChange={e=>setResumeCredits(a=>a.map((x,j)=>j===i?{...x,category:e.target.value}:x))}>{creditCategories.map(t=><option key={t}>{t}</option>)}</select></label>
     <label>Project<input style={input} value={c.production} onChange={e=>setResumeCredits(a=>a.map((x,j)=>j===i?{...x,production:e.target.value}:x))}/></label>
     <label>Role<input style={input} value={c.role_name} onChange={e=>setResumeCredits(a=>a.map((x,j)=>j===i?{...x,role_name:e.target.value}:x))}/></label>
     <label>Organization/Lead<input style={input} value={c.organization} onChange={e=>setResumeCredits(a=>a.map((x,j)=>j===i?{...x,organization:e.target.value}:x))}/></label>
     <label>Year<input style={input} type="number" value={c.credit_year||""} onChange={e=>setResumeCredits(a=>a.map((x,j)=>j===i?{...x,credit_year:e.target.value}:x))}/></label>
     <button type="button" onClick={()=>setResumeCredits(a=>a.filter((_,j)=>j!==i))}>Remove suggestion</button>
    </div>)}
    <p><button style={btn} disabled={resumeBusy} onClick={importResume}>Import {resumeCredits.length} credits</button></p>
   </div>}
  </div>{credits.length>0&&<div style={{padding:15,border:"1px solid #505b4a",borderRadius:12,marginBottom:15,background:"#111713"}}>
   <h3 style={{marginTop:0}}>Manage Resume Credits</h3>
   <label style={{display:"inline-flex",alignItems:"center",gap:9,cursor:"pointer",marginRight:16}}><input type="checkbox" disabled={busy} checked={credits.length>0&&selectedCreditIds.length===credits.length} onChange={e=>setSelectedCreditIds(e.target.checked?credits.map(c=>c.id):[])}/> Select all ({credits.length})</label>
   <button type="button" disabled={busy||!selectedCreditIds.length} onClick={()=>setSelectedCreditIds([])} style={{marginRight:12}}>Clear selection</button>
   <button type="button" disabled={busy||!selectedCreditIds.length} onClick={removeSelectedCredits} style={{padding:"10px 14px",background:selectedCreditIds.length?"#a93535":"#333",color:"#fff",border:0,borderRadius:8,cursor:selectedCreditIds.length?"pointer":"not-allowed"}}>Remove selected ({selectedCreditIds.length})</button>
   <p style={{fontSize:12,color:"#aaa"}}>Select individual credits below, or use Select all to remove several at once. You'll be asked to confirm.</p>
  </div>}
  {credits.map(c=><div key={c.id} style={{borderBottom:"1px solid #444",padding:10,display:"flex",alignItems:"flex-start",gap:12}}>
   <input type="checkbox" aria-label={"Select "+c.production} checked={selectedCreditIds.includes(c.id)} disabled={busy} onChange={e=>setSelectedCreditIds(a=>e.target.checked?[...a,c.id]:a.filter(id=>id!==c.id))} style={{marginTop:5,width:18,height:18,accentColor:"#b4ff39"}}/>
   <div style={{flex:1}}><strong>{c.production}</strong> — {c.role_name} <span style={{color:"#b4ff39"}}>({c.category||"Uncategorized"})</span><p>{c.organization} {c.credit_year||""} {c.verified?"✓ Verified":""}</p><button type="button" disabled={busy} onClick={()=>remove("professional_credits",c.id)}>Remove</button></div>
  </div>)}
   <h3>Additional Resume Credit</h3><form onSubmit={addCredit}><label style={{display:"block"}}>Credit category<select style={input} value={credit.category} onChange={e=>setCredit({...credit,category:e.target.value})}>{creditCategories.map(t=><option key={t}>{t}</option>)}</select></label>{["production","role_name","organization","credit_year"].map(k=><label key={k} style={{display:"block"}}>{({production:"Production / Project",role_name:"Your Role",organization:"Organization/Lead",credit_year:"Year"})[k]}<input style={input} type={k==="credit_year"?"number":"text"} required={k==="production"||k==="role_name"} value={credit[k]} onChange={e=>setCredit({...credit,[k]:e.target.value})}/></label>)}<button style={btn} disabled={busy}>Add Credit</button></form>
  </section>
 </>}
 {dashboardTab==="portfolio"&&<>  <section style={section}><h2>My Portfolio</h2>
   <p>Upload your best photos to showcase your work. JPG, PNG, WebP, or GIF, up to 10 MB each. Uploaded photos have public URLs.</p>
   <label style={{display:"block",marginBottom:18,fontWeight:700}}>Upload portfolio photos
    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={busy} onChange={uploadPortfolio} style={{display:"block",marginTop:10}}/>
   </label>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginBottom:25}}>
    {works.filter(w=>w.media_type==="image").map(w=><article key={w.id} style={{border:"1px solid #444",borderRadius:12,overflow:"hidden",background:"#0c0c0c"}}>
     <img src={w.media_url} alt={w.title} loading="lazy" style={{width:"100%",height:190,objectFit:"cover"}}/>
     <div style={{padding:13}}><strong>{w.title}</strong>{w.description&&<p>{w.description}</p>}<p><button type="button" onClick={()=>remove("portfolio_items",w.id)} style={{cursor:"pointer"}}>Remove photo</button></p></div>
    </article>)}
   </div>
   <h3>Social Media Links</h3>
   <p>Connect your Instagram, TikTok, and YouTube so clients can see more of your work. Click Save Profile to save changes.</p>
   {["instagram_url","tiktok_url","youtube_url"].map(k=><label key={k} style={{display:"block"}}>{({instagram_url:"Instagram",tiktok_url:"TikTok",youtube_url:"YouTube"})[k]}<input type="url" placeholder={({instagram_url:"https://www.instagram.com/yourname",tiktok_url:"https://www.tiktok.com/@yourname",youtube_url:"https://www.youtube.com/@yourchannel"})[k]} style={input} value={profile[k]||""} onChange={e=>change(k,e.target.value)}/></label>)}
   <button type="button" style={btn} disabled={busy} onClick={()=>save({preventDefault:()=>{}})}>Save Social Links</button>
  </section>
 </>}
 </div></div></main>;
}