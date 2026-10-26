import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
const headings=/^(experience|professional experience|selected credits|credits|film|television|tv|commercials|music videos|live performances|theatre|theater|tours|choreography|performance|work history|projects|resume|résumé|education|skills|training|awards|references|contact)$/i;
function parseCredits(text){
 const lines=text.split(/\r?\n/).map(x=>x.replace(/\s+/g," ").trim()).filter(Boolean);
 let section="",out=[];
 for(const line of lines){
  if(headings.test(line.replace(/:$/,""))){section=line.replace(/:$/,"");continue;}
  if(/^(education|skills|training|awards|references|contact)$/i.test(section))continue;
  if(line.length<5||line.length>180||/^(https?:|www\.|email:|phone:|@)/i.test(line)||/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(line))continue;
  const parts=line.split(/\s+[|•–—]\s+|\s{2,}/).map(x=>x.trim()).filter(Boolean);
  if(parts.length<2)continue;
  const yearMatch=line.match(/\b(19\d{2}|20\d{2})\b/);
  const year=yearMatch?Number(yearMatch[1]):null;
  const production=parts[0].replace(/\b(19\d{2}|20\d{2})\b/g,"").trim();
  const role=parts[1].replace(/\b(19\d{2}|20\d{2})\b/g,"").trim();
  if(!production||!role||production.length>100||role.length>100)continue;
  out.push({production,role_name:role,organization:parts.slice(2).join(" · ").slice(0,150),credit_year:year});
  if(out.length>=80)break;
 }
 return out;
}
export async function POST(request){
 try{
  const bearer=request.headers.get("authorization")||"";
  if(!bearer.startsWith("Bearer "))return NextResponse.json({error:"Sign in required."},{status:401});
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const {data:{user},error}=await db.auth.getUser(bearer.slice(7));
  if(error||!user)return NextResponse.json({error:"Invalid session."},{status:401});
  const form=await request.formData(),file=form.get("file");
  if(!file||typeof file==="string"||file.size>5*1024*1024)return NextResponse.json({error:"Upload a résumé under 5 MB."},{status:400});
  const name=file.name.toLowerCase(),buffer=Buffer.from(await file.arrayBuffer());
  let text="";
  if(name.endsWith(".pdf")){
   const pdf=(await import("pdf-parse")).default;
   text=(await pdf(buffer)).text;
  }else if(name.endsWith(".docx")){
   const mammoth=await import("mammoth");
   text=(await mammoth.extractRawText({buffer})).value;
  }else if(name.endsWith(".txt")){
   text=buffer.toString("utf8");
  }else return NextResponse.json({error:"Use PDF, DOCX, or TXT. Older DOC files aren't supported."},{status:400});
  if(!text.trim())return NextResponse.json({error:"No selectable text found. Scanned résumés need OCR and aren't supported yet."},{status:422});
  return NextResponse.json({credits:parseCredits(text),note:"Review every extracted credit before importing. Complex layouts may need corrections."});
 }catch(e){return NextResponse.json({error:"Unable to read résumé. Try a text-based PDF, DOCX, or TXT file."},{status:422});}
}