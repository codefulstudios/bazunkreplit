import {useAuth} from '@clerk/expo';
import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {router} from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {ActivityIndicator,ScrollView,Text,View} from '../components/ThemedNative';
import {Button,ui} from '../components/UI';
import {useCart} from '../cart';
import {memberJson,quoteCart} from '../api';
import {checkoutUrl,parseQuote,type Quote} from '../commerce';
export default function CartScreen(){return process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?<AccountCart/>:<Checkout/>}
function AccountCart(){const {isLoaded,isSignedIn,getToken,userId}=useAuth();return <Checkout signedIn={isLoaded&&!!isSignedIn} getToken={getToken} key={userId||'guest'}/>}
function Checkout({signedIn=false,getToken}:{signedIn?:boolean;getToken?:()=>Promise<string|null>}){
 const cart=useCart();const [quote,setQuote]=useState<Quote|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[revision,setRevision]=useState(0);const lock=useRef(false);const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 const lines=JSON.stringify(cart.items);
 useEffect(()=>{const c=new AbortController();
 // Quotes are invalidated immediately when persisted cart quantities change.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 setQuote(null);setError('');setLoading(cart.ready&&cart.items.length>0);
 if(cart.ready&&cart.items.length)void quoteCart(JSON.parse(lines),c.signal).then(parseQuote).then(q=>{if(!c.signal.aborted)setQuote(q)}).catch(e=>{if(!c.signal.aborted)setError(e.message)}).finally(()=>{if(!c.signal.aborted)setLoading(false)});
 return()=>c.abort();},[lines,cart.ready,revision,cart.items.length]);
 const request=useCallback(async(path:string,body?:unknown)=>{const token=await getToken?.();if(!token)throw Error('Sign in to continue checkout.');return await memberJson(path,token,body?{method:'POST',body}:{}) as {status?:string;url?:unknown;orders?:number};},[getToken]);
 async function run(action:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await action()}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Please retry.')}finally{lock.current=false;if(mounted.current)setBusy(false)}}
 const check=useRef<()=>void>(()=>{});
 useEffect(()=>{check.current=()=>{if(!signedIn||!cart.pending)return;void run(async()=>{const r=await request(`/mobile/checkout/${encodeURIComponent(cart.pending!)}`);if(r.status==='paid'){await cart.clearPaid();setNotice('Payment confirmed and orders created. Open Orders to view your purchase.')}else if(r.status==='expired'){await cart.setPending(null);setNotice('Checkout expired or was cancelled. Your items are still saved.');setRevision(n=>n+1)}else if(r.status==='processing')setNotice('Payment received. Orders are being prepared; check again shortly.');else setNotice('Payment is not confirmed. Resume checkout or cancel it before changing your cart.');})};});
 useEffect(()=>{const sub=AppState.addEventListener('change',s=>{if(s==='active')check.current()});return()=>sub.remove()},[]);
 useEffect(()=>{if(cart.ready&&cart.pending&&signedIn)check.current()},[cart.ready,cart.pending,signedIn]);
 async function start(){if(!quote||loading||!signedIn||cart.storageError)return;await run(async()=>{
 // Persist the attempt BEFORE creating a server session. Retrying uses this same key.
 const attempt=cart.pending||`app_${Date.now()}_${Math.random().toString(36).slice(2,14)}`;
 if(!cart.pending)await cart.setPending(attempt);
 const r=await request('/mobile/checkout',{attempt,items:cart.items,expectedTotal:quote.total,delivery:'standard'});
 if(r.status==='expired')throw Error('This checkout expired. Check payment status to unlock your cart.');
 if(r.status==='paid'||r.status==='processing'){setNotice('Check payment status to confirm your order.');return;}
 await WebBrowser.openBrowserAsync(checkoutUrl(r.url));setNotice('Return here after payment. We verify payment with Stripe before clearing your cart.');
 });}
 function change(id:number,n:number){try{cart.setQuantity(id,n);setError('')}catch(e){setError((e as Error).message)}}
 return <ScrollView contentContainerStyle={ui.page}><Text style={ui.title}>Your cart</Text>{!cart.ready&&<ActivityIndicator/>}{!!cart.storageError&&<Text style={ui.error}>{cart.storageError}</Text>}{!!notice&&<Text accessibilityLiveRegion="polite">{notice}</Text>}{cart.items.map(line=><View key={line.id} style={ui.card}><Text style={ui.title}>{quote?.items.find(i=>i.id===line.id)?.title||`Item #${line.id}`}</Text><Text>Quantity: {line.quantity}</Text><Button label="Decrease quantity" disabled={busy||!!cart.pending||line.quantity<=1} onPress={()=>change(line.id,line.quantity-1)}/><Button label="Increase quantity" disabled={busy||!!cart.pending||line.quantity>=50} onPress={()=>change(line.id,line.quantity+1)}/><Button label="Remove item" disabled={busy||!!cart.pending} onPress={()=>change(line.id,0)}/><Button label="View listing" onPress={()=>router.push({pathname:'/listing',params:{id:String(line.id)}})}/></View>)}{cart.ready&&!cart.items.length&&<Text>Your cart is empty.</Text>}{loading&&<ActivityIndicator/>}{quote&&!loading&&<View style={ui.card}><Text>Items: £{quote.subtotal.toFixed(2)}</Text>{!!quote.bundleDiscount&&<Text>Bundle discount: −£{quote.bundleDiscount.toFixed(2)}</Text>}<Text>Buyer Protection: £{quote.buyerProtectionFee.toFixed(2)}</Text><Text>Standard delivery: £{quote.delivery.toFixed(2)}</Text><Text style={ui.title}>Total: £{quote.total.toFixed(2)}</Text><Text>Charged in GBP. Fees and standard delivery are calculated by Bazunk. Enter your delivery address securely at Stripe checkout. Express delivery and collection are not currently available in the app.</Text></View>}{!!error&&<Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}{!!cart.items.length&&!cart.pending&&<Button label="Refresh total" disabled={busy||loading} onPress={()=>setRevision(n=>n+1)}/>}{signedIn?cart.pending?<><Button label="Check payment status" disabled={busy} onPress={()=>check.current()}/><Button label="Resume checkout" disabled={busy||loading||!quote||!!cart.storageError} onPress={()=>void start()}/><Button label="Cancel unpaid checkout" disabled={busy} onPress={()=>void run(async()=>{const r=await request(`/mobile/checkout/${encodeURIComponent(cart.pending!)}/cancel`,{});if(r.status!=='expired')throw Error('Payment may already have completed. Check payment status.');await cart.setPending(null);setRevision(n=>n+1);setNotice('Checkout cancelled. Your items remain saved.');})}/></>:!!cart.items.length&&<Button label={busy?'Opening checkout…':'Continue to secure payment'} disabled={!quote||loading||busy||!cart.ready||!!cart.storageError} onPress={()=>void start()}/>:!!cart.items.length&&<><Text>Sign in to pay. Your guest cart will be kept and combined with your saved account cart.</Text><Button label="Sign in to checkout" onPress={()=>router.push({pathname:'/account',params:{returnTo:'cart'}})}/></>}<Button label="Orders" onPress={()=>router.push('/orders')}/><Button label="Browse listings" onPress={()=>router.push('/')}/></ScrollView>;
}
