/** Server-only Bazunk Data Platform client. Never import into browser code. */
export type MarketplaceProductSource = "amazon"|"aliexpress"|"shopify"|"ebay"|"walmart";
export class DataPlatformError extends Error {
 constructor(public status:number,public code:string){super(`Data Platform request failed: ${code} (${status})`);}
}
function config(){
 const key=process.env.BAZUNK_DATA_PLATFORM_INTERNAL_KEY;
 const base=process.env.BAZUNK_DATA_PLATFORM_URL;
 if(!key||!base)throw new Error("data_platform_not_configured");
 const url=new URL(base);
 if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash)throw new Error("invalid_data_platform_url");
 return {key,url};
}
export async function marketplaceDataRequest(path:string,query:Record<string,string>={}):Promise<unknown>{
 if(!path.startsWith("/v1/")||path.startsWith("//"))throw new Error("invalid_data_platform_path");
 const {key,url}=config();
 const target=new URL(path,url.origin);
 for(const [k,v] of Object.entries(query))target.searchParams.set(k,v);
 let response:Response;
 try{response=await fetch(target,{headers:{"X-API-Key":key,accept:"application/json"},redirect:"error",signal:AbortSignal.timeout(12000)});}
 catch{throw new DataPlatformError(502,"data_platform_unreachable");}
 if(!response.ok)throw new DataPlatformError(response.status,typeof response.status==="number"&&response.status===503?"provider_unavailable":"data_platform_request_failed");
 const text=await response.text();
 if(text.length>2_000_000)throw new DataPlatformError(502,"data_platform_response_too_large");
 return JSON.parse(text) as unknown;
}
export function searchMarketplaceProducts(provider:MarketplaceProductSource,query:string,page=1){
 if(!query.trim()||query.length>200||!Number.isInteger(page)||page<1||page>100)throw new Error("invalid_search");
 return marketplaceDataRequest("/v1/products/search",{provider,q:query,page:String(page)});
}
export function lookupMarketplaceAmazon(asinOrUrl:string){
 return marketplaceDataRequest("/v1/products/lookup",asinOrUrl.startsWith("https://")?{url:asinOrUrl}:{asin:asinOrUrl});
}
export function getMarketplaceProduct(provider:MarketplaceProductSource,id:string){
 if(!id||id.length>200||id.includes("/"))throw new Error("invalid_product_id");
 return marketplaceDataRequest(`/v1/products/${provider}/${encodeURIComponent(id)}`);
}
