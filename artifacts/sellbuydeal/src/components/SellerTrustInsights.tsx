import { useEffect,useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, Star, Truck, MessageCircle, ShoppingBag } from "lucide-react";
type Reputation={reviews:{total:number;average:number;positive:number;negative:number};positivePercent:number|null;successfulSales:number;repeatBuyers:number;dispatchMedianHours:number|null;replyMedianHours:number|null;profile?:{verified:boolean};memberSince:string|null};
export function SellerTrustInsights(){
 const {user}=useAuth();
 const [data,setData]=useState<Reputation|null>(null),[error,setError]=useState("");
 useEffect(()=>{if(!user?.email)return;let live=true;fetch("/api/sellers/reputation?email="+encodeURIComponent(user.email))
 .then(async r=>{if(!r.ok)throw Error("Reputation data unavailable");return r.json();})
 .then(v=>{if(live)setData(v);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[user?.email]);
 if(!user?.email)return null;
 const metrics=[
  {label:"Verified reviews",value:data?.reviews.total??0,icon:Star},
  {label:"Successful sales",value:data?.successfulSales??0,icon:ShoppingBag},
  {label:"Repeat buyers",value:data?.repeatBuyers??0,icon:ShieldCheck},
  {label:"Median dispatch",value:data?.dispatchMedianHours==null?"Not enough data":data.dispatchMedianHours+" hours",icon:Truck},
  {label:"Median reply",value:data?.replyMedianHours==null?"Not enough data":data.replyMedianHours+" hours",icon:MessageCircle},
  {label:"Positive feedback",value:data?.positivePercent==null?"At least 3 reviews needed":data.positivePercent+"%",icon:Star},
 ];
 return <section className="rounded-2xl border-2 border-orange-300 bg-white p-5 text-slate-950 dark:border-orange-700 dark:bg-[#172541] dark:text-white"><h2 className="text-xl font-black">Seller trust & reputation</h2><p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">Only verified marketplace activity contributes. No artificial scores or badges.</p>
 {error&&<p className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
 {data&&<><p className="mt-3 font-bold">{data.profile?.verified?"Identity verified":"Identity verification not yet confirmed"} · {data.memberSince?"Member since "+new Date(data.memberSince).toLocaleDateString():"Join date unavailable"}</p><div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">{metrics.map(m=>{const Icon=m.icon;return <div key={m.label} className="rounded-xl border border-slate-300 p-3 dark:border-slate-600"><Icon className="h-5 w-5 text-orange-600"/><p className="mt-2 text-xs font-bold">{m.label}</p><p className="mt-1 text-lg font-black">{m.value}</p></div>;})}</div></>}
 </section>;
}