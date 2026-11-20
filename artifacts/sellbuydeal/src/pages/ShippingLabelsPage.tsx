import { useCallback, useEffect, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Truck, RefreshCw, ExternalLink } from "lucide-react";

type Shipment = {
 id: string; item_title: string; status: string; tracking_number: string | null;
 carrier: string | null; tracking_status: string | null; tracking_last_event: string | null;
 label_status: string | null; label_url: string | null; label_error: string | null;
};
type Rate = { id: string; provider: string; service: string; amount: string; currency: string; days?: number };
type Quote = { shipmentId: string; rates: Rate[] };
const emptyAddress = { name:"",street1:"",city:"",zip:"",country:"GB",phone:"",email:"" };
export function ShippingLabelsPage() {
 const { getToken, isSignedIn, isLoaded } = useClerkAuth();
 const [orders,setOrders] = useState<Shipment[]>([]);
 const [selected,setSelected] = useState<string | null>(null);
 const [from,setFrom] = useState({...emptyAddress});
 const [to,setTo] = useState({...emptyAddress});
 const [parcel,setParcel] = useState({length:20,width:15,height:10,weight:500});
 const [quote,setQuote] = useState<Quote | null>(null);
 const [busy,setBusy] = useState(false);
 const [error,setError] = useState("");
 const [notice,setNotice] = useState("");
 const api = useCallback(async (path:string, init:RequestInit={})=>{
  const token=await getToken();
  if(!token) throw new Error("Sign in to manage shipping");
  const response=await fetch("/api"+path,{...init,headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json",...init.headers}});
  const body=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(body.error||"Shipping request failed");
  return body;
 },[getToken]);
 const refresh=useCallback(async ()=>{
  if(!isSignedIn)return;
  try { setOrders(await api("/shipping/seller")); setError(""); }
  catch(e){setError(e instanceof Error?e.message:"Could not load shipments");}
 },[api,isSignedIn]);
 useEffect(()=>{void refresh();},[refresh]);
 const run=async(action:()=>Promise<void>)=>{
  setBusy(true);setError("");setNotice("");
  try{await action();}catch(e){setError(e instanceof Error?e.message:"Shipping operation failed");}
  finally{setBusy(false);}
 };
 const createQuote=()=>run(async()=>{
  if(!selected)return;
  const data=await api("/orders/"+encodeURIComponent(selected)+"/postage/quote",{method:"POST",body:JSON.stringify({from,to,parcel})});
  setQuote(data);
  if(!data.rates?.length)setNotice("No GBP carrier rates available for these addresses and parcel.");
 });
 const checkout=(rateId:string)=>run(async()=>{
  if(!selected||!quote)return;
  const data=await api("/orders/"+encodeURIComponent(selected)+"/postage/checkout",{method:"POST",body:JSON.stringify({shipmentId:quote.shipmentId,rateId})});
  if(!data.url||!/^https:\/\/checkout\.stripe\.com\//.test(data.url))throw new Error("Invalid checkout URL");
  window.location.assign(data.url);
 });
 const refreshTracking=(id:string)=>run(async()=>{
  await api("/orders/"+encodeURIComponent(id)+"/tracking/refresh",{method:"POST"});
  await refresh();setNotice("Tracking refreshed from Shippo");
 });
 if(!isLoaded)return <div className="p-8 text-gray-900">Loading shipping…</div>;
 return <div className="min-h-screen bg-slate-50 text-slate-900"><Navbar/><main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
  <div className="flex justify-between items-center"><div><h1 className="text-3xl font-black">Shipping & labels</h1><p className="text-slate-600">Real Shippo rates, Stripe checkout and carrier tracking. No simulated labels.</p></div><button onClick={()=>void refresh()} className="rounded-xl border border-blue-300 px-4 py-2 bg-white text-blue-800 flex gap-2"><RefreshCw size={16}/> Refresh</button></div>
  {!isSignedIn?<p className="bg-white p-5 rounded-xl">Sign in to view your orders and buy labels.</p>:null}
  {error?<p role="alert" className="bg-red-50 border border-red-300 text-red-800 rounded-xl p-4">{error}</p>:null}
  {notice?<p className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-4">{notice}</p>:null}
  <section className="space-y-3">{orders.map(o=><div key={o.id} className="bg-white border border-blue-100 rounded-2xl p-5 flex flex-wrap gap-4 justify-between items-center">
   <div><h2 className="font-bold">{o.item_title}</h2><p className="text-sm text-slate-600">Order {o.id} · {o.status} · Label: {o.label_status||"not purchased"}</p>
   {o.tracking_number?<p className="text-sm">Tracking: <strong>{o.tracking_number}</strong> ({o.carrier||"carrier pending"}) · {o.tracking_status||"awaiting update"}</p>:null}
   {o.tracking_last_event?<p className="text-sm text-slate-600">{o.tracking_last_event}</p>:null}
   {o.label_error?<p className="text-sm text-red-700">Requires review: {o.label_error}</p>:null}</div>
   <div className="flex flex-wrap gap-2">{o.label_url&&o.label_status==="purchased"?<a href={o.label_url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-blue-700 text-white px-3 py-2 flex gap-2 items-center">Open real PDF <ExternalLink size={14}/></a>:null}
   {["confirmed","preparing"].includes(o.status)&&!["purchased","purchasing","needs_review","checkout"].includes(o.label_status||"")?<button onClick={()=>{setSelected(o.id);setQuote(null);}} className="rounded-lg bg-orange-600 text-white px-3 py-2">Get postage quote</button>:null}
   {o.tracking_number?<button disabled={busy} onClick={()=>void refreshTracking(o.id)} className="rounded-lg border border-blue-300 text-blue-800 px-3 py-2">Refresh tracking</button>:null}</div>
  </div>)}{isSignedIn&&orders.length===0?<p className="bg-white rounded-xl p-6 text-slate-600">No seller orders to ship.</p>:null}</section>
  {selected?<section className="bg-white border border-orange-200 rounded-2xl p-6 space-y-4"><h2 className="font-bold text-xl">Quote for order {selected}</h2>
  <div className="grid md:grid-cols-2 gap-4">{([{title:"Sender address",value:from,set:setFrom},{title:"Recipient address",value:to,set:setTo}] as const).map(group=><fieldset key={group.title} className="space-y-2"><legend className="font-bold mb-2">{group.title}</legend>{(Object.keys(emptyAddress) as (keyof typeof emptyAddress)[]).map(key=><label key={key} className="block text-sm capitalize">{key}<input className="block w-full border border-slate-300 rounded-lg p-2 text-slate-900" value={group.value[key]} onChange={e=>group.set(v=>({...v,[key]:e.target.value}))}/></label>)}</fieldset>)}</div>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{(Object.keys(parcel) as (keyof typeof parcel)[]).map(key=><label key={key} className="text-sm capitalize">{key} ({key==="weight"?"g":"cm"})<input type="number" min="1" className="block w-full border border-slate-300 rounded-lg p-2" value={parcel[key]} onChange={e=>setParcel(v=>({...v,[key]:Number(e.target.value)}))}/></label>)}</div>
  <div className="flex gap-3"><button disabled={busy} onClick={()=>void createQuote()} className="rounded-xl bg-blue-700 text-white px-5 py-3 disabled:opacity-50">Get live rates</button><button onClick={()=>{setSelected(null);setQuote(null);}} className="rounded-xl border px-5 py-3">Cancel</button></div>
  {quote?<div className="space-y-2"><h3 className="font-bold">Available rates</h3>{quote.rates.map(r=><div key={r.id} className="border rounded-xl p-3 flex justify-between items-center"><span>{r.provider} · {r.service} · £{r.amount}</span><button disabled={busy} onClick={()=>void checkout(r.id)} className="rounded-lg bg-orange-600 text-white px-4 py-2">Pay with Stripe</button></div>)}</div>:null}</section>:null}
  <p className="text-sm text-slate-600 flex gap-2"><Truck size={16}/> A label is only available after Stripe payment and successful carrier purchase. Failed or uncertain purchases require review.</p>
 </main><Footer/></div>;
}
