/** GBP minor-unit calculations. No rounding floats in a payment calculation. */
export type SellerBundlePolicy = { sellerEmail: string; combinedShippingMinor: number; multiItemDiscountPercent: number; minItems: number; enabled: boolean };
export type BundleLine = { sellerEmail: string; priceMinor: number; quantity: number };
export function calculateSellerBundles(lines:BundleLine[], policies:SellerBundlePolicy[]) {
  const bySeller=new Map<string,BundleLine[]>();
  for(const line of lines) {
    if (!Number.isSafeInteger(line.priceMinor)||line.priceMinor<0||!Number.isInteger(line.quantity)||line.quantity<1)
      throw new Error("Invalid bundle line");
    const key=line.sellerEmail.trim().toLowerCase();
    bySeller.set(key,[...(bySeller.get(key)||[]),line]);
  }
  let discountMinor=0,shippingMinor=0;
  const breakdown:{sellerEmail:string;itemCount:number;discountMinor:number;shippingMinor:number}[]=[];
  for(const [email,items] of bySeller) {
    const policy=policies.find(p=>p.sellerEmail.trim().toLowerCase()===email && p.enabled);
    const count=items.reduce((n,l)=>n+l.quantity,0);
    const subtotal=items.reduce((n,l)=>n+l.priceMinor*l.quantity,0);
    const percent=policy?.multiItemDiscountPercent??0;
    if(!Number.isFinite(percent)||percent<0||percent>50)throw new Error("Invalid discount percent");
    const reduction=policy&&count>=Math.max(2,policy.minItems)?Math.round(subtotal*percent/100):0;
    const shipping=policy ? policy.combinedShippingMinor : 0;
    if(!Number.isSafeInteger(shipping)||shipping<0)throw new Error("Invalid shipping amount");
    discountMinor+=reduction;shippingMinor+=shipping;
    breakdown.push({sellerEmail:email,itemCount:count,discountMinor:reduction,shippingMinor:shipping});
  }
  return { discountMinor,shippingMinor,breakdown };
}
