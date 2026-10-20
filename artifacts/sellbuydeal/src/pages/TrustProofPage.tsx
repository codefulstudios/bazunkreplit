import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import { ArrowLeft, BadgeCheck, Camera, CheckCircle2, Clock3, Copy, FileCheck2,
 ImagePlus, LockKeyhole, RefreshCw, Shield, ShieldCheck, Upload, Video, X } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

type SellerListing={id:number;title:string;status:string;publicId?:string|null;image?:string|null};
type Kind="item"|"condition"|"serial"|"video";
type Proof={listing_id:number;challenge:string;issued_at:string;expires_at:string;
 status:"collecting"|"submitted"|"approved"|"rejected"|"revoked";has_serial:boolean;
 reviewed_at:string|null;review_note:string|null;external_provider:string|null;current:boolean};
type Detail={listing:{id:number;title:string;status:string};proof:Proof|null;
 media:{kind:Kind;bytes:number;mediaType:string}[]};
const box="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm dark:border-slate-600 dark:bg-[#192b49] dark:text-white";
const field="min-h-12 w-full rounded-xl border border-slate-400 bg-white px-4 py-3 text-base font-semibold text-slate-950 dark:border-slate-500 dark:bg-[#10213c] dark:text-white";
const btn="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black disabled:opacity-50";
const kinds:Record<Exclude<Kind,"video">,{title:string;description:string;private:boolean}>={
 item:{title:"1. Item + challenge",description:"Photograph the item beside the challenge code and today's UTC date, both clearly readable.",private:false},
 condition:{title:"2. Item condition",description:"Show the actual condition, including any scratches, damage or wear.",private:false},
 serial:{title:"3. Serial number (private)",description:"Show the serial or model tag with the challenge code. Only Bazunk reviewers can access this image.",private:true}
};
async function shrink(file:File):Promise<string>{
 if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw Error("Choose a JPG, PNG or WebP photo.");
 if(file.size>12*1024*1024)throw Error("Choose a photo smaller than 12MB.");
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();
  await new Promise<void>((ok,bad)=>{image.onload=()=>ok();image.onerror=()=>bad(Error("Could not open the photo"));image.src=url;});
  const ratio=Math.min(1,1200/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
  const ctx=canvas.getContext("2d");if(!ctx)throw Error("Photo processing is not supported.");
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const data=canvas.toDataURL("image/jpeg",0.75);
  if(data.length>3*1024*1024*4/3)throw Error("This photo is still too big; try a smaller one.");
  return data;
 }finally{URL.revokeObjectURL(url);}
}
const videoData=(blob:Blob)=>new Promise<string>((resolve,reject)=>{
 const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error("Video processing failed"));reader.readAsDataURL(blob);
});

export function TrustProofPage(){
 const {isLoaded,isSignedIn,getToken}=useAuth();
 const [listings,setListings]=useState<SellerListing[]>([]);
 const [selected,setSelected]=useState<number>(()=>Number(new URLSearchParams(window.location.search).get("listing")||0));
 const [detail,setDetail]=useState<Detail|null>(null);
 const [hasSerial,setHasSerial]=useState(true);
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[recording,setRecording]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const videoStream=useRef<MediaStream|null>(null),recorder=useRef<MediaRecorder|null>(null);
 const videoPreview=useRef<HTMLVideoElement|null>(null);
 const timer=useRef<number|null>(null);
 useEffect(()=>()=>{if(timer.current!==null)clearTimeout(timer.current);recorder.current?.state==="recording"&&recorder.current.stop();
   videoStream.current?.getTracks().forEach(t=>t.stop());
   if(videoPreview.current)videoPreview.current.srcObject=null;},[]);
 async function request(path:string,options:RequestInit={}){
  const token=await getToken();if(!token)throw Error("Sign in to use TrustProof.");
  const r=await fetch("/api/trust-proof"+path,{
   cache:"no-store",...options,
   headers:{Authorization:`Bearer ${token}`,...(options.body?{"Content-Type":"application/json"}:{}),...options.headers}
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.error||"TrustProof is unavailable.");
  return data;
 }
 async function loadListings(){
  if(!isSignedIn)return;
  setLoading(true);setError("");
  try{
   const token=await getToken();if(!token)throw Error("Sign in again.");
   const r=await fetch("/api/listings/mine",{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
   const data=await r.json().catch(()=>[]);
   if(!r.ok)throw Error("Couldn't load your listings.");
   setListings(Array.isArray(data)?data:[]);
  }catch(e){setError(e instanceof Error?e.message:"Unable to load your listings");}
  finally{setLoading(false);}
 }
 async function loadDetail(id:number){
  setError("");setNotice("");setDetail(null);
  if(!id)return;
  setLoading(true);
  try{
   const data=await request("/me/"+id);
   setDetail(data);setHasSerial(data.proof?.has_serial??true);
  }catch(e){setError(e instanceof Error?e.message:"Could not load proof");}
  finally{setLoading(false);}
 }
 useEffect(()=>{if(isLoaded&&isSignedIn)void loadListings();},[isLoaded,isSignedIn]);
 useEffect(()=>{if(isLoaded&&isSignedIn&&selected>0)void loadDetail(selected);},[isLoaded,isSignedIn,selected]);
 const execute=async(fn:()=>Promise<unknown>,success:string)=>{
  setError("");setNotice("");setBusy(true);
  try{await fn();setNotice(success);await loadDetail(selected);setNotice(success);}
  catch(e){setError(e instanceof Error?e.message:"Action failed.");}
  finally{setBusy(false);}
 };
 const start=()=>{
  const replace=Boolean(detail?.proof);
  if(replace&&!window.confirm("Start a new proof? This permanently replaces submitted evidence and removes any prior review or independent authentication status."))return;
  void execute(()=>request("/me/"+selected+"/start",{method:"POST",body:JSON.stringify({hasSerial,replace})}),
    "New challenge ready. Take fresh evidence showing this code and its UTC date.");
 };
 const upload=async(kind:Kind,file:File)=>{
  setError("");setNotice("");
  if(kind==="video"&&file.size>4*1024*1024){setError("Videos must be no more than 4 MB; record a 6-second clip instead.");return;}
  setBusy(true);
  try{
   const dataUrl=kind==="video"?await videoData(file):await shrink(file);
   await request("/me/"+selected+"/media/"+kind,{method:"POST",body:JSON.stringify({dataUrl})});
   await loadDetail(selected);
   setNotice(`${kind==="video"?"Video":kind==="serial"?"Private serial photo":kind==="item"?"Item photo":"Condition photo"} saved securely.`);
  }catch(e){setError(e instanceof Error?e.message:"Upload failed");}
  finally{setBusy(false);}
 };
 const capture=async()=>{
  if(recording||busy||!detail?.proof)return;
  setRecording(true);setError("");
  try{
   if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw Error("Video recording isn't supported here. Use the photo steps instead.");
   const mime=["video/webm;codecs=vp8","video/webm","video/mp4"].find(m=>MediaRecorder.isTypeSupported(m));
   if(!mime)throw Error("This browser doesn't support small video recordings. Use guided photos instead.");
   const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:720}},audio:false});
   videoStream.current=stream;
   if(videoPreview.current){videoPreview.current.srcObject=stream;
     await videoPreview.current.play().catch(()=>{});}
   const chunks:BlobPart[]=[];
   const r=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1_000_000});
   recorder.current=r;
   const done=new Promise<Blob>((resolve,reject)=>{
    r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    r.onerror=()=>reject(Error("Could not finish the video recording."));
    r.onstop=()=>resolve(new Blob(chunks,{type:mime.split(";")[0]}));
   });
   r.start(500);
   timer.current=window.setTimeout(()=>{if(r.state==="recording")r.stop();},6000);
   const blob=await done;
   if(blob.size>4*1024*1024)throw Error("Recording exceeds 4 MB. Use guided photos instead.");
   const ext=mime.startsWith("video/mp4")?"mp4":"webm";
   await upload("video",new File([blob],`bazunk-trustproof.${ext}`,{type:blob.type}));
  }catch(e){setError(e instanceof Error?e.message:"Video capture failed");}
  finally{
   if(timer.current!==null)clearTimeout(timer.current);timer.current=null;
   videoStream.current?.getTracks().forEach(t=>t.stop());videoStream.current=null;
   if(videoPreview.current)videoPreview.current.srcObject=null;
   recorder.current=null;setRecording(false);
  }
 };
 const proof=detail?.proof;
 const expired=proof?.status==="collecting" && new Date(proof.expires_at).getTime()<Date.now();
 const canCapture=proof?.status==="collecting"&&proof.current&&!expired;
 const uploaded=new Set(detail?.media.map(m=>m.kind)||[]);
 const ready=canCapture&&(uploaded.has("video")||(uploaded.has("item")&&uploaded.has("condition")&&(!proof?.has_serial||uploaded.has("serial"))));
 const selectedListing=listings.find(l=>l.id===selected);
 return <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#0b192e] dark:text-white">
  <Navbar/>
  <main className="mx-auto max-w-5xl space-y-5 px-3 py-6 pb-28 sm:px-5">
   <header className="rounded-3xl bg-gradient-to-r from-indigo-800 via-blue-700 to-orange-600 p-6 text-white">
    <Link href="/dashboard?section=my-listings" className="inline-flex items-center gap-1 text-sm font-bold text-white"><ArrowLeft className="h-4 w-4"/> My listings</Link>
    <h1 className="mt-4 flex items-center gap-3 text-3xl font-black"><ShieldCheck className="h-9 w-9"/> Bazunk TrustProof</h1>
    <p className="mt-2 max-w-3xl font-semibold text-white">Show buyers extra evidence of the item you're selling. Take guided, current photos or a short video with a unique challenge code.</p>
    <p className="mt-2 text-sm font-bold text-white">Submitting evidence does not verify identity or authenticate the goods. Human review is required.</p>
   </header>
   {!isLoaded?<div className={box}>Loading secure account…</div>:!isSignedIn?
    <section className={box+" text-center"}><LockKeyhole className="mx-auto h-8 w-8 text-indigo-600"/><p className="my-3 font-bold">Sign in to provide evidence for your own listings.</p><Link href="/sign-in" className={btn+" bg-orange-600 text-white"}>Sign in</Link></section>:<>
    {error&&<div role="alert" className="rounded-xl border border-red-400 bg-red-50 p-4 font-bold text-red-950 dark:bg-red-950 dark:text-red-100">{error}</div>}
    {notice&&<div role="status" className="rounded-xl border border-green-400 bg-green-50 p-4 font-bold text-green-900 dark:bg-green-950 dark:text-green-100">{notice}</div>}
    <section className={box}>
     <h2 className="mb-3 text-xl font-black">Choose your listing</h2>
     <select className={field} value={selected||""} onChange={e=>setSelected(Number(e.target.value))} aria-label="Choose listing">
      <option value="">Select an active listing</option>
      {listings.filter(l=>l.status==="active").map(l=><option key={l.id} value={l.id}>{l.title} · #{l.id}</option>)}
     </select>
     {!listings.some(l=>l.status==="active")&&!loading&&<p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">No active listings found. <Link href="/sell/direct" className="font-black underline">Create a listing</Link> first.</p>}
     {selectedListing?.status!=="active"&&selected>0&&<p className="mt-2 text-sm font-bold text-amber-700 dark:text-amber-200">TrustProof starts on active listings only.</p>}
     {selectedListing?.status==="active"&&<Link href={`/listing/${selectedListing.publicId||selected}`} className="mt-2 inline-flex items-center text-sm font-bold text-indigo-700 underline dark:text-indigo-200">View this listing</Link>}
    </section>
    {loading&&selected>0&&<p role="status" className="text-sm font-bold">Loading TrustProof…</p>}
    {detail&&<>
     <section className={box+" space-y-4"}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div>
       <h2 className="text-xl font-black">Proof for {detail.listing.title}</h2>
       <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Status: <strong className="capitalize">{proof?.status||"Not started"}</strong>{proof&&!proof.current?" · listing was changed, new proof required":""}</p>
      </div>
      <button type="button" disabled={busy||recording} onClick={start} className={btn+" bg-orange-600 text-white"}><RefreshCw className="h-4 w-4"/>{proof?"Start new challenge":"Start TrustProof"}</button></div>
      {proof?.status==="approved"&&proof.current&&<p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100"><BadgeCheck className="mr-2 inline h-4 w-4"/> Evidence reviewed by Bazunk. This is not independent goods authentication.</p>}
      {proof?.status==="submitted"&&<p className="rounded-xl bg-blue-50 p-3 font-semibold text-blue-950 dark:bg-blue-950 dark:text-blue-100">Evidence received and waiting for a Bazunk reviewer. Buyers see it as unreviewed submission.</p>}
      {proof?.status==="rejected"&&<p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-950 dark:bg-amber-950 dark:text-amber-100">Evidence needs another attempt: {proof.review_note||"Please capture clearer proof."}</p>}
      {proof&&proof.status!=="revoked"&&<button onClick={()=>{if(window.confirm("Revoke this proof? Buyers will no longer see its evidence-review or authentication labels."))void execute(()=>request("/me/"+selected+"/revoke",{method:"POST"}),"Proof revoked.");}} className="text-sm font-bold text-red-700 underline dark:text-red-300">Revoke TrustProof</button>}
      {(!proof||proof.status==="revoked"||expired||!proof.current)&&
       <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Start a new 30-minute challenge. Previously submitted or approved evidence will be replaced only after your confirmation.</p>}
      {(!proof||proof.status==="revoked"||expired||!proof.current)&&
       <label className="flex items-center gap-3 text-sm font-bold text-slate-900 dark:text-white">
        <input type="checkbox" checked={hasSerial} onChange={e=>setHasSerial(e.target.checked)} className="h-5 w-5 accent-orange-600"/> This item has a serial or model number
       </label>}
     </section>
     {proof&&proof.status==="collecting"&&proof.current&&!expired&&<>
      <section className={box}>
       <h2 className="flex items-center gap-2 text-lg font-black"><Clock3 className="h-5 w-5 text-indigo-500"/> Your live challenge</h2>
       <div className="my-3 rounded-2xl border-2 border-orange-400 bg-slate-950 p-5 text-center text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-white">Handwrite this code on paper</p>
        <p data-testid="trust-proof-code" className="mt-2 break-all font-mono text-3xl font-black tracking-widest text-white">{proof.challenge}</p>
        <p className="mt-3 text-sm font-bold text-white">UTC date: {new Date(proof.issued_at).toLocaleDateString("en-GB",{timeZone:"UTC",day:"2-digit",month:"short",year:"numeric"})}</p>
        <p className="mt-1 text-xs font-semibold text-white">Expires {new Date(proof.expires_at).toLocaleString()}</p>
       </div>
       <button type="button" className={btn+" border border-slate-400 text-slate-900 dark:text-white"}
        onClick={()=>navigator.clipboard.writeText(proof.challenge)}><Copy className="h-4 w-4"/> Copy code</button>
       <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Place the written code and date next to the real product in your photos or video. Do not edit the code into a photo digitally, use stock photos, or show identity documents.</p>
      </section>
      <section className={box+" space-y-4"}>
       <div><h2 className="text-xl font-black">Option A · Guided photos</h2><p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Take fresh photos on your phone. The serial image is kept private to reviewers.</p></div>
       {(Object.entries(kinds) as [Exclude<Kind,"video">,typeof kinds.item][]).filter(([k])=>k!=="serial"||proof.has_serial).map(([kind,info])=><div key={kind} className="rounded-xl border border-slate-300 p-4 dark:border-slate-600">
        <div className="flex flex-wrap items-center justify-between gap-2">
         <h3 className="font-black">{info.title}</h3>
         {uploaded.has(kind)&&<span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900"><CheckCircle2 className="h-4 w-4"/> Uploaded</span>}
        </div>
        <p className="my-2 text-sm font-medium text-slate-700 dark:text-slate-200">{info.description}</p>
        <label className={btn+" cursor-pointer border border-indigo-500 bg-indigo-50 text-indigo-950 dark:border-indigo-400 dark:bg-[#253d63] dark:text-white"}>
         <Camera className="h-4 w-4"/>{uploaded.has(kind)?"Replace photo":"Take or choose photo"}
         <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only"
          disabled={busy||recording} onChange={e=>{const file=e.target.files?.[0];e.target.value="";if(file)void upload(kind,file);}}/>
        </label>
       </div>)}
      </section>
      <section className={box+" space-y-3"}>
       <h2 className="text-xl font-black">Option B · Short verification video</h2>
       <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">A single continuous six-second clip can replace the guided photos. Show the handwritten challenge, item condition and serial tag (if one exists). Videos and serial numbers remain private to reviewers.</p>
       <video ref={videoPreview} playsInline autoPlay muted
        aria-label="Live camera preview during verification video recording"
        className={recording?"mb-3 aspect-video w-full max-w-md rounded-xl border border-indigo-400 bg-black object-cover":"hidden"} />
       {recording&&<p role="status" className="text-sm font-black text-indigo-700 dark:text-indigo-200">Recording now — keep the dated code, item condition and identifying label in view.</p>}
       <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy||recording} onClick={()=>void capture()} className={btn+" bg-indigo-700 text-white"}>
         <Video className="h-4 w-4"/>{recording?"Recording 6 seconds…":"Record a six-second clip"}</button>
        <label className={btn+" cursor-pointer border border-slate-400 text-slate-900 dark:text-white"}>
         <Upload className="h-4 w-4"/> Upload short video
         <input type="file" accept="video/mp4,video/webm" className="sr-only" disabled={busy||recording}
          onChange={e=>{const f=e.target.files?.[0];e.target.value="";if(f)void upload("video",f);}}/>
        </label>
       </div>
       {uploaded.has("video")&&<p className="text-sm font-black text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="mr-1 inline h-4 w-4"/> Private video uploaded</p>}
       <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">MP4 or WebM, maximum 4 MB. Browser camera permission is required to record; use photos if unsupported.</p>
      </section>
      <section className={box+" space-y-3"}>
       <h2 className="text-lg font-black">Submit for review</h2>
       <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Photos: item + condition{proof.has_serial?" + private serial":""}, or one full short video. Bazunk checks these manually. No authenticity badge is granted automatically.</p>
       <button type="button" disabled={!ready||busy||recording} onClick={()=>void execute(()=>request("/me/"+selected+"/submit",{method:"POST"}),"Evidence submitted for human review.")}
        className={btn+" w-full bg-orange-600 text-white"} data-testid="trust-proof-submit"><FileCheck2 className="h-5 w-5"/>{busy?"Working…":"Submit TrustProof evidence"}</button>
      </section>
     </>}
     {proof?.status==="collecting"&&expired&&<p role="alert" className={box+" font-bold text-amber-700 dark:text-amber-200"}>This 30-minute challenge expired. Start another before submitting.</p>}
     <section className={box}>
      <h2 className="flex items-center gap-2 text-lg font-black"><Shield className="h-5 w-5 text-indigo-500"/> What the badges actually mean</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
       {[
        ["Identity verified","Only an existing completed Bazunk identity-verification status; separate from these photos."],
        ["Item evidence reviewed","A reviewer checked the challenge and the item's appearance, not brand authenticity."],
        ["Independently authenticated","Requires a separately verified third-party authenticator report; not issued by seller uploads."]
       ].map(([heading,body])=><div key={heading} className="rounded-xl bg-slate-100 p-3 dark:bg-[#10213c]"><h3 className="font-black">{heading}</h3><p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">{body}</p></div>)}
      </div>
     </section>
    </>}
   </>}
  </main><Footer/>
 </div>;
}
