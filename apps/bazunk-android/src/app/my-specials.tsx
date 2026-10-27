import {ActivityIndicator, ScrollView, Text} from '../components/ThemedNative';
import {useLocalSearchParams} from 'expo-router';
import {useState} from 'react';

import {SellerAccess} from '../components/SellerAccess';
import {Button,ui} from '../components/UI';
import {AdCard,SaleCard} from '../components/SpecialUI';
import {useMemberData} from '../hooks';
import {parseAds,parseSales} from '../specials';
export default function MySpecials(){const {kind}=useLocalSearchParams<{kind?:string}>();return <SellerAccess><Mine key={kind} kind={kind}/></SellerAccess>}
function Mine({kind}:{kind?:string}){const [tab,setTab]=useState(kind==='flash-sales'?'flash-sales':'classifieds');return <ScrollView contentContainerStyle={ui.page}><Text style={ui.title}>Your ads and sales</Text><Button label={tab==='classifieds'?'Show my flash sales':'Show my classifieds'} onPress={()=>setTab(t=>t==='classifieds'?'flash-sales':'classifieds')}/>{tab==='classifieds'?<MyAds/>:<MySales/>}</ScrollView>}
function MyAds(){const [page,setPage]=useState(0);const {data,error,loading,reload}=useMemberData(`/mobile/classifieds/mine?offset=${page*25}`,parseAds);return <><Button label="Refresh" disabled={loading} onPress={reload}/>{loading&&<ActivityIndicator/>}{!!error&&<Text style={ui.error}>{error}</Text>}{data?.length===0&&<Text style={ui.copy}>No owned ads on this page. Older ads without an ownership record require admin help.</Text>}{data?.map(a=><AdCard key={a.id} ad={a}/>)}{page>0&&<Button label="Previous page" disabled={loading} onPress={()=>setPage(p=>p-1)}/>} {data?.length===25&&<Button label="Next page" disabled={loading} onPress={()=>setPage(p=>p+1)}/>}</>}
function MySales(){const [page,setPage]=useState(0);const {data,error,loading,reload}=useMemberData(`/mobile/flash-sales/mine?offset=${page*25}`,parseSales);return <><Button label="Refresh" disabled={loading} onPress={reload}/>{loading&&<ActivityIndicator/>}{!!error&&<Text style={ui.error}>{error}</Text>}{data?.length===0&&<Text style={ui.copy}>No flash sales on this page.</Text>}{data?.map(s=><SaleCard key={s.id} sale={s}/>)}{page>0&&<Button label="Previous page" disabled={loading} onPress={()=>setPage(p=>p-1)}/>} {data?.length===25&&<Button label="Next page" disabled={loading} onPress={()=>setPage(p=>p+1)}/>}</>}
