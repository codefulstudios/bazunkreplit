export type PublicSettings=Record<string,string>;
export function parsePublicSettings(value:unknown):PublicSettings{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.values(value).some(v=>typeof v!=='string'))throw Error('Marketplace settings are unavailable.');
 return value as PublicSettings;
}
export function routeFeature(href:string):string|undefined{
 const path=href.split(/[?#]/)[0].replace(/\/$/,'')||'/';
 const groups:Record<string,string[]>={
 quick_sell:['sell'],auctions:['auctions','auction','auction-create','my-auctions'],
 flash_sales:['flash-sales','flash-sale','flash-create'],classifieds:['classifieds','classified','classified-edit'],
 live:['live'],offers:['offers','offer-create','deal-payment'],messaging:['messages','conversation'],
 importers:['importers'],promotions:['promotions'],games:['rewards','arcade','game'],credits:['credits'],
 watchers:['saved'],reviews:['seller-reviews','order-review','review-report'],verification:['verification'],
 disputes_returns:['cases','case-create','case-detail'],trust_proof:['trust-proof'],deal_pilot:['deal-pilot'],
 find_it:['find-it'],referrals:['referrals'],buyer_protection:['buyer-protection']};
 const first=path.split('/')[1];
 return Object.keys(groups).find(key=>groups[key].includes(first));
}
export function allowedRoute(settings:PublicSettings|null,path:string){
 const feature=routeFeature(path);
 return !!settings&&settings.maintenance_mode!=='true'&&(!feature||settings['feature_'+feature]!=='false');
}
export function publicMedia(value?:string){
 if(!value)return undefined;
 if(/^\/api\/site-media\/[a-f0-9-]{36}$/i.test(value))return 'https://bazunk-api.onrender.com'+value;
 if(/^https:\/\//i.test(value))return value;
 return undefined;
}
export function safeWebsitePath(value:string){return /^\/(?!\/)[^\\\s]*$/.test(value)?value:'/';}

