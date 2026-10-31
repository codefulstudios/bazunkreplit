import {useMarketplaceSettings} from './MarketplaceSettings';
import {featureEnabled} from '../storefront';
import {Text, View} from './ThemedNative';
import {useAuth,useUser} from '@clerk/expo';
import {router} from 'expo-router';
import {useRef,useState} from 'react';

import {listingContent} from '../listing-content';
import type {Listing} from '../api';
import {useCart} from '../cart';
import {useMemberData,useMemberRequest} from '../hooks';
import {Button,ui} from './UI';
function parseWatched(x:unknown):number[]{const data=x as {listingIds?:unknown};if(!data||!Array.isArray(data.listingIds)||data.listingIds.some(id=>!Number.isInteger(id)))throw Error('Could not load saved status.');return data.listingIds}
export function ListingActions({item}:{item:Listing}){const cart=useCart();const [error,setError]=useState('');return <View style={{gap:12}}><Button label={listingContent(item).hasVariations?'Review options on website':item.quantity===0?'Out of stock':item.status&&item.status!=='active'?'Unavailable':cart.ids.includes(item.id)?'View cart':'Add to cart'} disabled={listingContent(item).hasVariations||item.quantity===0||(!!item.status&&item.status!=='active')||!cart.ready||!!cart.pending||!!cart.storageError} onPress={()=>{try{if(!cart.ids.includes(item.id))cart.add(item.id);router.push('/cart')}catch(e){setError(e instanceof Error?e.message:'Could not add item.')}}}/>{!!error&&<Text style={ui.error}>{error}</Text>}{process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?<SessionActions item={item}/>:<Button label="Your account" onPress={()=>router.push('/account')}/>}</View>}

export function SessionActions({item}:{item:Listing}){const {isLoaded,isSignedIn,userId}=useAuth();return isLoaded&&isSignedIn?<MemberActions key={`${userId}:${item.id}`} item={item}/>:<Button label="Sign in to buy or message" onPress={()=>router.push('/account')}/>}
function MemberActions({item}:{item:Listing}){const {user}=useUser();const {snapshot}=useMarketplaceSettings();const settings=snapshot?.settings||null;const request=useMemberRequest();const {data,error:watchError,reload}=useMemberData('/watchers/mine',parseWatched,featureEnabled(settings,'watchers'));const [busy,setBusy]=useState(false);const [error,setError]=useState('');const lock=useRef(false);const owned=Boolean(item.sellerEmail&&item.sellerEmail.toLowerCase()===user?.primaryEmailAddress?.emailAddress.toLowerCase());
async function action(kind:'watch'|'message'){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{if(kind==='watch'){await request(`/listings/${item.id}/watch`,{method:data?.includes(item.id)?'DELETE':'POST'});reload()}else{const c=await request('/messages/conversations',{method:'POST',body:{listingId:item.id}}) as {id?:unknown};if(!Number.isInteger(c?.id))throw Error('Unexpected conversation response.');router.push({pathname:'/conversation',params:{id:String(c.id),title:item.title}})}}catch(e){setError(e instanceof Error?e.message:'Could not complete this action.')}finally{lock.current=false;setBusy(false)}}
if(owned)return <Button label="Edit your listing" onPress={()=>router.push({pathname:'/sell',params:{id:item.id}})}/>;
return <View style={{gap:12}}>{featureEnabled(settings,'watchers')&&<Button label={data?.includes(item.id)?'Remove from saved':'Save item'} disabled={busy||!data} onPress={()=>void action('watch')}/>}{featureEnabled(settings,'offers')&&(item.currency||'GBP')==='GBP'&&<Button label="Make an offer" disabled={busy} onPress={()=>router.push({pathname:'/offer-create',params:{id:String(item.id)}})}/>}{featureEnabled(settings,'messaging')&&<Button label="Message seller" disabled={busy} onPress={()=>void action('message')}/>}{!!watchError&&<><Text style={ui.error}>{watchError}</Text><Button label="Retry saved status" onPress={reload}/></>}{!!error&&<Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}</View>}
