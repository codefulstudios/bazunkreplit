import {ActivityIndicator, Pressable, ScrollView, Text, View} from '../components/ThemedNative';
import {router} from 'expo-router';

import {useMemberData} from '../hooks';
import {SellerAccess} from '../components/SellerAccess';
import {Button,ui} from '../components/UI';
type Conversation={id:number;with:{name:string};listingTitle:string;unread:number;lastText:string};
function parse(data:unknown):Conversation[]{if(!Array.isArray(data)||data.some(x=>!Number.isInteger(x.id)||typeof x.with?.name!=='string'||typeof x.listingTitle!=='string'||typeof x.lastText!=='string'||!Number.isFinite(x.unread)))throw Error('Unexpected conversations response.');return data}
export default function Messages(){return <SellerAccess><Inbox/></SellerAccess>}
function Inbox(){const {data,error,loading,reload}=useMemberData('/messages/conversations',parse);return <ScrollView contentContainerStyle={ui.page}><Text style={ui.title}>Messages</Text><Button label="Refresh inbox" disabled={loading} onPress={reload}/>{loading&&<ActivityIndicator/>}{!!error&&<><Text style={ui.error}>{error}</Text><Button label="Retry" onPress={reload}/></>}{data?.length===0&&<Text style={ui.copy}>No conversations yet. Message a seller from a listing.</Text>}{data?.map(c=><Pressable accessibilityRole="button" key={c.id} onPress={()=>router.push({pathname:'/conversation',params:{id:c.id,title:c.listingTitle}})}><View style={ui.card}><Text style={ui.link}>{c.with.name}{c.unread>0?` · ${c.unread} unread`:''}</Text><Text style={ui.copy}>{c.listingTitle}</Text><Text style={ui.copy} numberOfLines={2}>{c.lastText}</Text></View></Pressable>)}</ScrollView>}
