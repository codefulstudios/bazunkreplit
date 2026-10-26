import {useEffect,useState} from 'react';
import {router} from 'expo-router';
import {ActivityIndicator,ScrollView,Text,View} from 'react-native';
import {quoteCart} from '../api';
import {useCart} from '../cart';
import {parseQuote,type Quote} from '../commerce';
import {Button,ui} from './UI';
export function GuestCart(){
 const cart=useCart();const ids=cart.ids.join(',');
 const [quote,setQuote]=useState<Quote|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(false);const [retry,setRetry]=useState(0);
 useEffect(()=>{const c=new AbortController();
 // The quote is external data and must reset whenever the cart changes.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 setQuote(null);setError('');setLoading(Boolean(ids));
 if(ids)void quoteCart(ids.split(',').map(Number),c.signal).then(parseQuote).then(q=>{if(!c.signal.aborted)setQuote(q)}).catch(e=>{if(!c.signal.aborted)setError(e instanceof Error?e.message:'Could not calculate fees.')}).finally(()=>{if(!c.signal.aborted)setLoading(false)});
 return()=>c.abort();},[ids,retry]);
 return <ScrollView contentContainerStyle={ui.page}><Text style={ui.title}>Your cart</Text>{!cart.ready&&<ActivityIndicator/>}{!!cart.storageError&&<Text style={ui.error}>{cart.storageError}</Text>}{cart.ready&&!ids&&<Text style={ui.copy}>Your cart is empty. Add an item from its listing.</Text>}{cart.ids.map(id=><View style={ui.card} key={id}><Text style={ui.copy}>{quote?.items.find(i=>i.id===id)?.title||`Item #${id}`}</Text><Button label="View listing" onPress={()=>router.push({pathname:'/listing',params:{id:String(id)}})}/><Button label="Remove item" disabled={!!cart.pending} onPress={()=>cart.remove(id)}/></View>)}{loading&&<ActivityIndicator/>}{quote&&<View style={ui.card}><Text style={ui.copy}>Items: £{quote.subtotal.toFixed(2)}</Text><Text style={ui.copy}>Buyer Protection: £{quote.buyerProtectionFee.toFixed(2)}</Text><Text style={ui.copy}>Delivery: £{quote.delivery.toFixed(2)}</Text>{!!quote.bundleDiscount&&<Text style={ui.copy}>Bundle discount: −£{quote.bundleDiscount.toFixed(2)}</Text>}<Text style={ui.title}>Total: £{quote.total.toFixed(2)}</Text></View>}{!!error&&<><Text style={ui.error}>{error}</Text><Button label="Retry fee calculation" onPress={()=>setRetry(n=>n+1)}/></>}{!!ids&&<Text style={ui.copy}>You can save items here without signing in. App checkout is not connected yet; no payment has been taken.</Text>}<Button label="Your account" onPress={()=>router.push('/account')}/><Button label="Browse listings" onPress={()=>router.push('/')}/></ScrollView>
}
