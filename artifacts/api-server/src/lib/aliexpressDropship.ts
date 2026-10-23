import { createHmac } from "node:crypto";

/** Official AliExpress Dropshipping API. Never expose credentials to the browser. */
export function dropshipConfigured(): boolean {
  return Boolean(process.env.ALIEXPRESS_DS_APP_KEY && process.env.ALIEXPRESS_DS_APP_SECRET && process.env.ALIEXPRESS_DS_ACCESS_TOKEN);
}
type Product = { externalId: string; title: string; description: string; images: {url:string}[]; price:{amount:number;currency:string}; sourceUrl:string; rating:number };
const absolute = (value:unknown):string => {
  const s=String(value??"");
  return s.startsWith("//") ? "https:"+s : /^https:\/\//i.test(s) ? s : "";
};
function normalize(p:any):Product {
  const id=String(p.itemId??p.product_id??p.productId??p.ae_item_base_info_dto?.product_id??"");
  const images=[p.itemMainPic,p.product_main_image_url,p.ae_multimedia_info_dto?.image_urls?.split(";")?.[0],p.image].map(absolute).filter(Boolean);
  const price=Number(p.targetSalePrice??p.target_sale_price??p.ae_item_sku_info_dtos?.ae_item_sku_info_d_t_o?.[0]?.offer_sale_price??p.price??0);
  return {externalId:id,title:String(p.title??p.product_title??p.ae_item_base_info_dto?.subject??""),description:String(p.description??p.ae_item_base_info_dto?.detail??""),images:images.map(url=>({url})),price:{amount:Number.isFinite(price)?price:0,currency:"USD"},sourceUrl:absolute(p.itemUrl??p.product_detail_url) || (id?"https://www.aliexpress.com/item/"+id+".html":""),rating:Number(p.score??0)||0};
}
async function call(method:string, extra:Record<string,string>):Promise<any> {
  if (!dropshipConfigured()) throw new Error("AliExpress Dropshipping API credentials missing: configure ALIEXPRESS_DS_APP_KEY, ALIEXPRESS_DS_APP_SECRET and ALIEXPRESS_DS_ACCESS_TOKEN on Render");
  const params:Record<string,string>={app_key:process.env.ALIEXPRESS_DS_APP_KEY!,session:process.env.ALIEXPRESS_DS_ACCESS_TOKEN!,method,sign_method:"sha256",timestamp:String(Date.now()),format:"json",v:"2.0",...extra};
  const payload=Object.keys(params).sort().map(k=>k+params[k]).join("");
  params.sign=createHmac("sha256",process.env.ALIEXPRESS_DS_APP_SECRET!).update(payload).digest("hex").toUpperCase();
  const response=await fetch("https://api-sg.aliexpress.com/sync",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams(params),signal:AbortSignal.timeout(25000)});
  if(!response.ok) throw new Error("AliExpress API HTTP "+response.status);
  const json=await response.json() as any;
  if(json.error_response) throw new Error("AliExpress API "+String(json.error_response.code??"error")+": "+String(json.error_response.sub_msg??json.error_response.msg??"Request rejected").slice(0,180));
  const key=method.replace(/\./g,"_")+"_response";
  const result=json[key];
  if(!result) throw new Error("AliExpress API returned no "+key+" payload");
  if(result.code && !["00","0","200"].includes(String(result.code))) throw new Error("AliExpress API "+String(result.code)+": "+String(result.msg??"Request rejected"));
  return result;
}
export async function searchDropship(q:string,page:number):Promise<Product[]> {
  const result=await call("aliexpress.ds.text.search",{keyword:q,countryCode:"GB",currency:"USD",local:"en_US",page_index:String(page),page_size:"20"});
  const list=result.data?.products?.selection_search_product??[];
  if(!Array.isArray(list)) throw new Error("AliExpress search response has an unexpected format");
  return list.map(normalize).filter((p:Product)=>/^\d{10,20}$/.test(p.externalId)&&p.title&&p.price.amount>0);
}
export async function getDropshipProduct(id:string):Promise<Product> {
  if(!/^\d{10,20}$/.test(id)) throw new Error("Invalid AliExpress product ID");
  const result=await call("aliexpress.ds.product.get",{product_id:id,ship_to_country:"GB",target_currency:"USD",target_language:"EN"});
  const raw=result.result??result.data??result;
  const p=normalize({...raw,product_id:id});
  if(!p.title) throw new Error("AliExpress returned no product title; check product availability and access permissions");
  return p;
}
export function aliExpressProductId(raw:string):string|null {
  const input=raw.trim();
  if(/^\d{10,20}$/.test(input)) return input;
  try{
    const u=new URL(input);
    if(u.protocol!=="https:" || !(u.hostname==="aliexpress.com"||u.hostname.endsWith(".aliexpress.com"))) return null;
    return u.pathname.match(/\/(?:item\/)?(\d{10,20})(?:\.html)?\/?$/)?.[1]??u.searchParams.get("productId")?.match(/^\d{10,20}$/)?.[0]??null;
  } catch{return null;}
}
