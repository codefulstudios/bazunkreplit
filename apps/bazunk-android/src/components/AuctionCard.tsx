import {Text, View} from './ThemedNative';
import {router} from 'expo-router';
import {Image} from 'react-native';
import type {Auction} from '../auctions';
import {Button,ui} from './UI';
export function AuctionCard({auction:a}:{auction:Auction}){return <View style={ui.card}>{a.images[0]&&<Image source={{uri:a.images[0]}} style={{height:170,borderRadius:12}} resizeMode="contain"/>}<Text style={ui.link}>{a.title}</Text><Text style={ui.copy}>£{(a.currentBid??a.startingBid).toFixed(2)} · {a.bidCount} bids</Text><Text style={ui.copy}>{a.status==='active'?`Ends ${new Date(a.endTime).toLocaleString()}`:a.status}</Text>{a.myBid!=null&&<Text style={ui.copy}>Your highest bid: £{a.myBid.toFixed(2)}{a.isLeading?' · Highest bidder':''}</Text>}<Button label="View auction" onPress={()=>router.push({pathname:'/auction',params:{id:a.id}})}/></View>}
