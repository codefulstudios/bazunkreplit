import { useAuth } from '@clerk/expo';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
type CartState={ids:number[];pending:string|null};
type CartContextValue=CartState&{ready:boolean;storageError:string;add:(id:number)=>void;remove:(id:number)=>void;setPending:(id:string|null)=>Promise<void>;clearPaid:()=>Promise<void>};
const Context=createContext<CartContextValue|null>(null);
export function AppCart({children}:{children:ReactNode}){return process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?<AccountCart>{children}</AccountCart>:<CartProvider owner="guest">{children}</CartProvider>}
function AccountCart({children}:{children:ReactNode}){const {userId}=useAuth();return <CartProvider key={userId||'guest'} owner={userId||'guest'}>{children}</CartProvider>}
function CartProvider({owner,children}:{owner:string;children:ReactNode}){
 const key=`bazunk.cart.${owner.replace(/[^a-zA-Z0-9_.-]/g,'_')}`;
 const writes=useRef<Promise<unknown>>(Promise.resolve());
 const persist=useCallback((value:CartState)=>{const next=writes.current.catch(()=>{}).then(()=>SecureStore.setItemAsync(key,JSON.stringify(value)));writes.current=next;return next;},[key]);
 const [state,setState]=useState<CartState>({ids:[],pending:null});const [ready,setReady]=useState(false);const [storageError,setStorageError]=useState('');
 useEffect(()=>{let live=true;void SecureStore.getItemAsync(key).then(raw=>{if(!live)return;if(raw){const s=JSON.parse(raw);if(!Array.isArray(s.ids)||s.ids.length>30||s.ids.some((id:unknown)=>!Number.isInteger(id)||Number(id)<=0)||(s.pending!==null&&typeof s.pending!=='string'))throw Error('Invalid cart');setState({ids:[...new Set<number>(s.ids)],pending:s.pending})}}).catch(()=>{if(live)setStorageError('Could not restore the saved cart. Check Orders before starting a new payment.')}).finally(()=>{if(live)setReady(true)});return()=>{live=false}},[key]);
 useEffect(()=>{if(ready)void persist(state).catch(()=>setStorageError('Could not save the cart on this device. Keep the app open until payment is confirmed.'))},[persist,ready,state]);
 function add(id:number){if(!ready||state.pending)throw Error('Wait for the current checkout to finish.');if(state.ids.length>=30&&!state.ids.includes(id))throw Error('The cart supports up to 30 different items.');setState(s=>{if(s.ids.includes(id))return s;if(s.ids.length>=30)return s;return {...s,ids:[...s.ids,id]}})}
 return <Context.Provider value={{...state,ready,storageError,add,remove:id=>setState(s=>s.pending?s:{...s,ids:s.ids.filter(i=>i!==id)}),setPending:async id=>{const next={...state,pending:id};setState(next);await persist(next)},clearPaid:async()=>{const next={ids:[],pending:null};setState(next);await persist(next)}}}>{children}</Context.Provider>;
}
export function useCart(){const value=useContext(Context);if(!value)throw Error('Cart provider is missing');return value;}
