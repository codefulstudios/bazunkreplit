import {useAuth} from '@clerk/expo';
import * as SecureStore from 'expo-secure-store';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {changeQuantity,emptyCart,mergeCarts,parseCart,type CartState} from './cart-state';
type Value=CartState&{ids:number[];ready:boolean;storageError:string;add:(id:number)=>void;remove:(id:number)=>void;setQuantity:(id:number,n:number)=>void;setPending:(id:string|null)=>Promise<void>;clearPaid:()=>Promise<void>};
const Context=createContext<Value|null>(null);
type Saved={version:2;carts:Record<string,CartState>};
const storageKey='bazunk.carts.v2';
// One serialized document makes guest-to-account transfer atomic across restarts.
let writes:Promise<unknown>=Promise.resolve();
export function AppCart({children}:{children:ReactNode}){return process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?<AccountCart>{children}</AccountCart>:<CartProvider owner="guest">{children}</CartProvider>}
function AccountCart({children}:{children:ReactNode}){const {isLoaded,userId}=useAuth();return <CartProvider owner={isLoaded?(userId||'guest'):null}>{children}</CartProvider>}
function CartProvider({owner,children}:{owner:string|null;children:ReactNode}){
 const [view,setView]=useState<{owner:string|null;cart:CartState}>({owner:null,cart:emptyCart()});const [storageError,setStorageError]=useState('');
 const doc=useRef<Saved>({version:2,carts:{}});const current=useRef<CartState>(emptyCart());const active=useRef<string|null>(null);
 const ready=owner!==null&&view.owner===owner;
 useEffect(()=>{let live=true;active.current=null;if(!owner)return;
 const job=writes.catch(()=>{}).then(async()=>{
  const raw=await SecureStore.getItemAsync(storageKey);const saved:Saved=raw?JSON.parse(raw):{version:2,carts:{}};
  if(saved.version!==2||!saved.carts||typeof saved.carts!=='object')throw Error('Invalid cart storage');
  for(const key of [owner,'guest'])if(!Object.hasOwn(saved.carts,key)){const legacy=await SecureStore.getItemAsync(`bazunk.cart.${key.replace(/[^a-zA-Z0-9_.-]/g,'_')}`);saved.carts[key]=legacy?parseCart(JSON.parse(legacy)):emptyCart();}
  let cart=parseCart(saved.carts[owner]);let warning='';
  if(owner!=='guest'&&saved.carts.guest.items.length){try{cart=mergeCarts(cart,parseCart(saved.carts.guest));saved.carts.guest=emptyCart()}catch(e){warning=(e as Error).message+' Guest items are retained; sign out to access them.';}}
  saved.carts[owner]=cart;await SecureStore.setItemAsync(storageKey,JSON.stringify(saved));
  if(live){doc.current=saved;current.current=cart;active.current=owner;setView({owner,cart});setStorageError(warning)}
 });writes=job;void job.catch(()=>{if(live)setStorageError('Could not restore your cart. Restart the app to retry; saved items have not been overwritten.')});return()=>{live=false};
 },[owner]);
 function save(next:CartState){if(!ready||active.current!==owner||!owner)throw Error('Wait for your cart to load.');const account=owner;current.current=next;doc.current={...doc.current,carts:{...doc.current.carts,[account]:next}};const snapshot=JSON.stringify(doc.current);setView({owner:account,cart:next});const task=writes.catch(()=>{}).then(()=>SecureStore.setItemAsync(storageKey,snapshot));writes=task;void task.catch(()=>{if(active.current===account)setStorageError('Could not save your cart. Restart the app before attempting payment.')});return task;}
 function quantity(id:number,n:number){void save(changeQuantity(current.current,id,n)).catch(()=>{});}
 const cart=ready?view.cart:emptyCart();
 return <Context.Provider value={{...cart,ids:cart.items.map(i=>i.id),ready,storageError,add:id=>quantity(id,(current.current.items.find(i=>i.id===id)?.quantity??0)+1),remove:id=>quantity(id,0),setQuantity:quantity,setPending:id=>save({...current.current,pending:id}),clearPaid:()=>save(emptyCart())}}>{children}</Context.Provider>;
}
export function useCart(){const value=useContext(Context);if(!value)throw Error('Cart provider is missing');return value;}
