import {NativeAd} from '../components/NativeAd';
import {ActivityIndicator, ScrollView, Text} from '../components/ThemedNative';
import {useState} from 'react';
import {router} from 'expo-router';

import {parseAuctions} from '../auctions';
import {usePublicData} from '../publicData';
import {AuctionCard} from '../components/AuctionCard';
import {Button,ui} from '../components/UI';
export default function Auctions(){const [status,setStatus]=useState('active');const [page,setPage]=useState(0);const {data,error,loading,reload}=usePublicData(`/mobile/auctions?status=${status}&offset=${page*25}`,parseAuctions);return <ScrollView contentContainerStyle={ui.page}><Text style={ui.title}>Bazunk auctions</Text><Button label="Create an auction" onPress={()=>router.push('/auction-create')}/><Button label="My bids and auctions" onPress={()=>router.push('/my-auctions')}/><Button label={status==='active'?'Show ended auctions':'Show active auctions'} disabled={loading} onPress={()=>{setStatus(s=>s==='active'?'ended':'active');setPage(0)}}/><Button label="Refresh auctions" disabled={loading} onPress={reload}/>{loading&&<ActivityIndicator/>}{!!error&&<><Text style={ui.error}>{error}</Text><Button label="Retry" onPress={reload}/></>}{data?.length===0&&<Text style={ui.copy}>No {status} auctions on this page.</Text>}{data?.map(a=><AuctionCard key={a.id} auction={a}/>)}{page>0&&<Button label="Previous page" disabled={loading} onPress={()=>setPage(p=>p-1)}/>} {data?.length===25&&<Button label="Next page" disabled={loading} onPress={()=>setPage(p=>p+1)}/>}<NativeAd slot="auctions_mid"/></ScrollView>}
