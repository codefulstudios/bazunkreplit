import { useEffect, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/react";
import { Link, useLocation } from "wouter";
import { Bell, Home, Search, ShoppingCart, Tag } from "lucide-react";
import { useCart } from "@/context/CartContext";

/** Only on discovery routes: checkout and listing editors own their action footer. */
export function MobileShopNav() {
 const [location] = useLocation();
 const { isSignedIn, getToken } = useClerkAuth();
 const { itemCount, openCart } = useCart();
 const [unread,setUnread]=useState(0);
 const visible=location==="/" || location.startsWith("/browse") ||
  location.startsWith("/search") || location.startsWith("/categories") ||
  location.startsWith("/listing/") || location.startsWith("/notifications");
 useEffect(()=>{
  if(!visible || !isSignedIn){setUnread(0);return;}
  const controller=new AbortController();
  let active=true;
  const refresh=async()=>{
   if(document.visibilityState==="hidden")return;
   try{
    const token=await getToken();
    if(!token || !active)return;
    const response=await fetch("/api/notifications",{headers:{Authorization:`Bearer ${token}`},
      cache:"no-store",signal:controller.signal});
    if(!response.ok)return;
    const data=await response.json();
    if(active)setUnread(Math.max(0,Number(data.unread)||0));
   }catch{/* Bottom navigation remains usable when notifications are unavailable. */}
  };
  void refresh();
  const timer=window.setInterval(()=>{void refresh();},60_000);
  const onFocus=()=>{void refresh();};
  window.addEventListener("focus",onFocus);
  return()=>{active=false;controller.abort();window.clearInterval(timer);window.removeEventListener("focus",onFocus);};
 },[visible,isSignedIn,getToken]);
 if(!visible)return null;
 const links=[
  {href:"/",label:"Home",icon:Home},
  {href:"/browse",label:"Browse",icon:Search},
  {href:"/sell/direct",label:"Sell",icon:Tag},
  {href:"/notifications",label:"Alerts",icon:Bell},
 ];
 return <nav aria-label="Mobile quick navigation" data-testid="mobile-shop-nav"
   className="fixed inset-x-0 bottom-0 z-[55] border-t border-slate-600 bg-[#101d35]/95 px-2 pt-2 shadow-[0_-8px_30px_rgba(0,0,0,.28)] backdrop-blur-xl md:hidden"
   style={{paddingBottom:"max(8px,env(safe-area-inset-bottom))"}}>
   <div className="grid grid-cols-5 gap-1">
    {links.map(({href,label,icon:Icon})=>{
     const selected=location===href||(href==="/browse"&&(location.startsWith("/browse")||location.startsWith("/search")))||
      (href==="/notifications"&&location.startsWith("/notifications"));
     return <Link key={href} href={href} aria-current={selected?"page":undefined}
      className={`relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[11px] font-bold ${selected?"bg-[#25456f] text-white":"text-slate-200 hover:bg-[#243957] hover:text-white"}`}>
      <Icon className="h-5 w-5" aria-hidden="true"/>{label}
      {label==="Alerts"&&unread>0&&<span aria-label={`${unread} unread notifications`} className="absolute right-1 top-0 rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-black text-white">{unread>99?"99+":unread}</span>}
     </Link>;
    })}
    <button type="button" onClick={openCart} aria-label={`Open shopping cart with ${itemCount} items`}
     className="relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[11px] font-bold text-slate-200 hover:bg-[#243957] hover:text-white">
     <ShoppingCart className="h-5 w-5" aria-hidden="true"/>Cart
     {itemCount>0&&<span className="absolute right-1 top-0 rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-black text-white">{itemCount>99?"99+":itemCount}</span>}
    </button>
   </div>
  </nav>;
}
