import {useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {readAdvertisement,type AdSlot} from '../advertising';
import {useMarketplaceSettings} from './MarketplaceSettings';
export function NativeAd({slot}:{slot:AdSlot}){
 const {snapshot}=useMarketplaceSettings();const [error,setError]=useState('');
 const ad=readAdvertisement(snapshot?.settings||{},slot);if(!ad)return null;
 async function open(){if(!ad?.url)return;try{setError('');await WebBrowser.openBrowserAsync(ad.url)}catch{setError('Could not open this advertisement. Please try again.')}}
 return <View accessibilityLabel="Advertisement" style={{marginVertical:12,padding:20,borderRadius:20,backgroundColor:'#4A36B8',gap:12}}>
 <Text style={{color:'#fff',fontSize:11,fontWeight:'700'}}>ADVERTISEMENT</Text>
 {!!ad.title&&<Text style={{color:'#fff',fontSize:21,fontWeight:'800'}}>{ad.title}</Text>}{!!ad.body&&<Text style={{color:'#fff',fontSize:15,lineHeight:23}}>{ad.body}</Text>}
 {ad.url&&<Pressable accessibilityRole="link" accessibilityLabel={`${ad.cta}, opens browser`} onPress={()=>void open()} style={{padding:16,borderRadius:12,backgroundColor:'#101C38',minHeight:48}}><Text style={{color:'#fff',fontWeight:'700'}}>{ad.cta} ↗</Text></Pressable>}
 {!!error&&<Text accessibilityRole="alert" style={{color:'#fff'}}>{error}</Text>}
 </View>;
}
