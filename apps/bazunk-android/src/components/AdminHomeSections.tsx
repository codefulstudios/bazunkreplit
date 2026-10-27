import {Image,Pressable,ScrollView,Text,View} from 'react-native';
import {parseHomeSections,parseSectionContent} from '../homepage-sections';
import {allowedRoute,publicMedia,safeWebsitePath} from '../admin-policy';
import {useMarketplaceSettings} from './MarketplaceSettings';
import {openWebsite} from './AppMenu';
import type {ReactNode} from 'react';
export function AdminHomeSections({promoted}:{promoted:ReactNode}){
 const {snapshot}=useMarketplaceSettings();if(!snapshot)return null;
 const settings=snapshot.settings;const content=parseSectionContent(settings.home_sections_content);
 const features:Record<string,string>={live:'live',rewards:'games'};
 return <View style={{gap:24}}>{parseHomeSections(settings.home_sections_layout).filter(section=>section.enabled).map(({id})=>{
  if(features[id]&&settings['feature_'+features[id]]==='false')return null;
  if(id==='announcement')return settings.announcement_enabled==='true'&&!!settings.announcement_text?<View key={id} style={{padding:16,borderRadius:16,backgroundColor:'#FFF0DF'}}><Text style={{color:'#79390B'}}>{settings.announcement_text}</Text></View>:null;
  if(id==='promoted')return <View key={id}>{promoted}</View>;
  // Advertising requires its own placement API; never substitute invented adverts.
  if(id==='ads')return null;
  const section=content[id];const path=safeWebsitePath(section.url||'/');
  return <View key={id} style={{gap:12}}><Text style={{fontSize:20,fontWeight:'700',color:'#102A56'}}>{section.title}</Text>{!!section.description&&<Text style={{color:'#344563',lineHeight:22}}>{section.description}</Text>}
   {!!section.cards?.length&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:12}}>{section.cards.filter(card=>allowedRoute(settings,safeWebsitePath(card.url||'/'))).map((card,index)=><Pressable key={index} accessibilityRole="button" onPress={()=>void openWebsite(safeWebsitePath(card.url||'/'))} style={{width:240,padding:18,gap:12,backgroundColor:'#102A56',borderRadius:18}}>
   {!!publicMedia(card.image)&&<Image source={{uri:publicMedia(card.image)}} style={{height:120,width:'100%'}} resizeMode="cover"/>}<Text style={{color:'#fff',fontSize:18,fontWeight:'700'}}>{card.title}</Text><Text style={{color:'#E2E8F0',lineHeight:21}}>{card.description}</Text><Text style={{color:'#FFBF91'}}>Explore on website ↗</Text></Pressable>)}</ScrollView>}
   {!!section.button&&allowedRoute(settings,path)&&<Pressable accessibilityRole="button" onPress={()=>void openWebsite(path)} style={{padding:14,backgroundColor:'#E7EFFF',borderRadius:12}}><Text style={{color:'#175CD3',fontWeight:'700'}}>{section.button} ↗</Text></Pressable>}
  </View>;
 })}</View>;
}
