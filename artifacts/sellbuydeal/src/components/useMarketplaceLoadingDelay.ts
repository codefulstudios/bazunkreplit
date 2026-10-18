import { useEffect, useRef, useState } from "react";
import { useRawSettings } from "@/context/SiteSettingsContext";

/** Keeps the loader visible for the configured minimum, never hides a real request. */
export function useMarketplaceLoadingDelay(loading: boolean, area: string) {
 const settings=useRawSettings();
 const duration=Number(settings.marketplace_loader_min_ms || "0");
 const minimum=[0,500,1000,2000].includes(duration)?duration:0;
 const enabled=settings["marketplace_loader_area_"+area]==="true";
 const [visible,setVisible]=useState(loading);
 const started=useRef<number|null>(loading?Date.now():null);
 useEffect(()=>{
   if(loading){if(started.current===null)started.current=Date.now();setVisible(true);return;}
   const wait=enabled?Math.max(0,minimum-(Date.now()-(started.current??Date.now()))):0;
   if(!wait){started.current=null;setVisible(false);return;}
   const id=window.setTimeout(()=>{started.current=null;setVisible(false)},wait);
   return ()=>window.clearTimeout(id);
 },[loading,minimum,enabled]);
 return loading||visible;
}
