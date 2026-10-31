export type CartLine = {id:number;quantity:number};
export type CartState = {items:CartLine[];pending:string|null};
export const emptyCart = ():CartState=>({items:[],pending:null});
export function parseCart(value:unknown):CartState {
 const v=value as {items?:CartLine[];ids?:number[];pending?:unknown};
 const items=v?.items??v?.ids?.map(id=>({id,quantity:1}));
 if(!Array.isArray(items)||items.length>30||items.some(i=>!Number.isSafeInteger(i.id)||i.id<1||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>50)||new Set(items.map(i=>i.id)).size!==items.length||(v.pending!=null&&(typeof v.pending!=='string'||v.pending.length>200)))throw Error('Invalid saved cart');
 return {items,pending:typeof v.pending==='string'?v.pending:null};
}
export function mergeCarts(account:CartState,guest:CartState):CartState {
 if(account.pending||guest.pending)throw Error('Finish the existing checkout before combining carts.');
 const items=account.items.map(i=>({...i}));
 for(const line of guest.items){const existing=items.find(i=>i.id===line.id);if(existing){if(existing.quantity+line.quantity>50)throw Error('Combined quantity exceeds 50. Reduce the quantity before signing in.');existing.quantity+=line.quantity}else items.push({...line});}
 if(items.length>30)throw Error('Combined cart exceeds 30 listings. Remove items before combining carts.');
 return {items,pending:null};
}
export function changeQuantity(cart:CartState,id:number,quantity:number):CartState {
 if(cart.pending)throw Error('Finish or cancel the open checkout before changing your cart.');
 if(!Number.isSafeInteger(id)||id<1||!Number.isInteger(quantity)||quantity<0||quantity>50)throw Error('Choose a quantity from 1 to 50.');
 const items=cart.items.filter(i=>i.id!==id);if(quantity)items.push({id,quantity});
 if(items.length>30)throw Error('The cart supports up to 30 listings.');
 return {items,pending:null};
}
