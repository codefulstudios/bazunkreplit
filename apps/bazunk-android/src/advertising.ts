export const AD_SLOTS=['home_bottom','browse_top','browse_bottom','auctions_mid','flash_sales_mid','categories_top','classifieds_mid','support_mid','live_left','live_bottom','rewards_right'] as const;
export type AdSlot=typeof AD_SLOTS[number];
export function advertisementUrl(value:string){
 const url=value.trim();
 if(/^\/(?!\/)[^\\\s]*$/.test(url))return 'https://www.bazunk.com'+url;
 try{const parsed=new URL(url);if(parsed.protocol==='https:'&&!parsed.username&&!parsed.password)return parsed.href}catch{}
 return null;
}
export function readAdvertisement(settings:Record<string,string>,slot:AdSlot){
 const key='ad_'+slot+'_';
 if(settings[key+'enabled']!=='true')return null;
 // Reuse the admin's native text creative for every type. Never run HTML or ad scripts.
 const title=(settings[key+'text_title']||'').trim(),body=(settings[key+'text_body']||'').trim();
 if(!title&&!body)return null;
 return {title,body,cta:settings[key+'text_cta']||'Learn more',url:advertisementUrl(settings[key+'text_url']||'')};
}
