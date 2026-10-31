import {ActivityIndicator, ScrollView, Text} from '../components/ThemedNative';
import {useState} from 'react';

import {parseAuctions} from '../auctions';
import {useMemberData} from '../hooks';
import {AuctionCard} from '../components/AuctionCard';
import {SellerAccess} from '../components/SellerAccess';
import {Button,ui} from '../components/UI';
export default function MyAuctions(){return <SellerAccess><Mine/></SellerAccess>}
function Mine(){const [mode,setMode]=useState('bids');const [page,setPage]=useState(0);const {data,error,loading,reload}=useMemberData(`/mobile/auctions/mine?mode=${mode}&offset=${page*25}`,parseAuctions);return <ScrollView contentContainerStyle={ui.page}><Text style={ui.title}>{mode==='bids'?'My bids':'My auctions'}</Text><Button label={mode==='bids'?'Show my selling auctions':'Show my bids'} onPress={()=>{setMode(m=>m==='bids'?'selling':'bids');setPage(0)}}/><Button label="Refresh" disabled={loading} onPress={reload}/>{loading&&<ActivityIndicator/>}{!!error&&<Text style={ui.error}>{error}</Text>}{data?.length===0&&<Text style={ui.copy}>Nothing on this page yet.</Text>}{data?.map(a=><AuctionCard key={a.id} auction={a}/>)}{page>0&&<Button label="Previous page" disabled={loading} onPress={()=>setPage(p=>p-1)}/>} {data?.length===25&&<Button label="Next page" disabled={loading} onPress={()=>setPage(p=>p+1)}/>}<Text style={ui.copy}>Open an ended auction to check its final result. Auction payments are not connected to the app cart yet.</Text></ScrollView>}
