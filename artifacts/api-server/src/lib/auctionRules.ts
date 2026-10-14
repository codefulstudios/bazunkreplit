/** Pure auction rules shared by the bid endpoint and regression tests. */
export function minimumBid(start: number, current: number | null, increment: number): number {
  return current === null ? start : current + increment;
}
export function canAcceptBid(input: {status:string;endTime:number;now:number;seller:string;bidder:string;amount:number;start:number;current:number|null;increment:number}): boolean {
  return input.status === "active" && input.endTime > input.now &&
    input.seller.toLowerCase() !== input.bidder.toLowerCase() &&
    Number.isFinite(input.amount) && input.amount >= minimumBid(input.start,input.current,input.increment);
}
export function qualifiesForSale(winningBid:number|null,reserve:number|null):boolean {
  return winningBid !== null && Number.isFinite(winningBid) && (reserve === null || winningBid >= reserve);
}
export function mayFinalize(status:string,endTime:number,now:number):boolean {
  return status === "active" && endTime <= now;
}
