import {BrandLogo} from './BrandLogo';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {AccessibilityInfo,Alert,Animated,Modal,Pressable,ScrollView,StyleSheet,Text,useWindowDimensions,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router,type Href,usePathname} from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {useMarketplaceSettings} from './MarketplaceSettings';
import {routeFeature,safeWebsitePath} from '../admin-policy';
import {featureEnabled,palette as c} from '../storefront';
type Item={label:string;icon:string;route?:Href;web?:string;flag?:string};
const groups:{title:string;items:Item[]}[]=[
 {title:'Explore',items:[{label:'Home',icon:'⌂',route:'/'},{label:'Browse & categories',icon:'▦',route:'/browse'},{label:'Auctions',icon:'🔨',web:'/auctions',flag:'auctions'},{label:'Flash sales',icon:'⚡',web:'/flash-sales',flag:'flash_sales'},{label:'Classifieds',icon:'📋',web:'/classifieds',flag:'classifieds'}]},
 {title:'Your Bazunk',items:[{label:'Your account',icon:'👤',route:'/account'},{label:'Cart',icon:'🛒',route:'/cart'},{label:'Messages',icon:'✉',web:'/messages',flag:'messaging'},{label:'Purchases & saved items',icon:'♡',web:'/dashboard'}]},
 {title:'Sell & manage',items:[{label:'Sell an item',icon:'＋',web:'/sell',flag:'quick_sell'},{label:'Seller dashboard',icon:'▤',web:'/dashboard'},{label:'Import inventory',icon:'📦',web:'/importers',flag:'importers'},{label:'Promote listings',icon:'📣',web:'/promotions',flag:'promotions'}]},
 {title:'Discover more',items:[{label:'Rewards arcade',icon:'🎮',web:'/rewards',flag:'games'},{label:'Live selling',icon:'▶',web:'/live',flag:'live'},{label:'Help & support',icon:'?',web:'/support'},{label:'Terms & privacy',icon:'✓',route:'/legal'}]},
];
export async function openWebsite(path:string){try{await WebBrowser.openBrowserAsync(`https://www.bazunk.com${safeWebsitePath(path)}`)}catch{Alert.alert('Could not open Bazunk','Please try again.')}}
const MenuContext=createContext<()=>void>(()=>{});
export const useAppMenu=()=>useContext(MenuContext);
export function MenuContents({onNavigate=()=>{}}:{onNavigate?:()=>void}){
 const pathname=usePathname();const {snapshot}=useMarketplaceSettings();const settings=snapshot?.settings||null;
 return <ScrollView contentContainerStyle={s.contents} keyboardShouldPersistTaps="handled">
 <Text style={s.hint}>Items marked Website open Bazunk in your browser. You may need to sign in there.</Text>
 {groups.map(group=><View key={group.title} style={s.group}><Text style={s.groupTitle}>{group.title}</Text>{group.items.filter(i=>featureEnabled(settings,i.flag||routeFeature(String(i.web||i.route||'')))).map(item=><Pressable key={item.label} accessibilityRole="button" accessibilityLabel={`${item.label}${item.web?', opens website':''}`} accessibilityState={{selected:!!item.route&&pathname===item.route}} style={[s.row,pathname===item.route&&s.active]} onPress={()=>{onNavigate();if(item.route)router.navigate(item.route);else if(item.web)void openWebsite(item.web)}}><Text style={s.icon}>{item.icon}</Text><Text style={s.label}>{item.label}</Text>{item.web?<Text style={s.web}>Website ↗</Text>:<Text style={s.arrow}>›</Text>}</Pressable>)}</View>)}
 </ScrollView>
}
export function AppMenu({children}:{children:ReactNode}){
 const {snapshot}=useMarketplaceSettings();
 const [open,setOpen]=useState(false);const [progress]=useState(()=>new Animated.Value(0));const {width}=useWindowDimensions();const drawerWidth=Math.min(360,width*0.88);const reduced=useRef(false);
 useEffect(()=>{void AccessibilityInfo.isReduceMotionEnabled().then(v=>{reduced.current=v});const subscription=AccessibilityInfo.addEventListener('reduceMotionChanged',v=>{reduced.current=v});return()=>subscription.remove()},[]);
 function close(){Animated.timing(progress,{toValue:0,duration:reduced.current?0:180,useNativeDriver:true}).start(({finished})=>{if(finished)setOpen(false)})}
 return <MenuContext.Provider value={()=>{progress.setValue(0);setOpen(true)}}>{children}<Modal visible={open&&!!snapshot&&snapshot.settings.maintenance_mode!=='true'} transparent animationType="none" onRequestClose={close} onShow={()=>Animated.timing(progress,{toValue:1,duration:reduced.current?0:240,useNativeDriver:true}).start()}>
 <View style={s.overlay}><Animated.View style={[StyleSheet.absoluteFill,{opacity:progress}]}><Pressable accessibilityRole="button" accessibilityLabel="Close navigation menu" style={s.scrim} onPress={close}/></Animated.View><Animated.View accessibilityViewIsModal style={[s.drawer,{width:drawerWidth,transform:[{translateX:progress.interpolate({inputRange:[0,1],outputRange:[-drawerWidth,0]})}]}]}><SafeAreaView style={{flex:1}}><View style={s.top}><BrandLogo style={s.logo}/><Pressable accessibilityRole="button" accessibilityLabel="Close menu" onPress={close} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View><MenuContents onNavigate={()=>{progress.stopAnimation();setOpen(false)}}/></SafeAreaView></Animated.View></View>
 </Modal></MenuContext.Provider>
}
const s=StyleSheet.create({overlay:{flex:1},scrim:{flex:1,backgroundColor:'#07182DB3'},drawer:{height:'100%',backgroundColor:'#fff',borderTopRightRadius:24,borderBottomRightRadius:24,overflow:'hidden'},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:18,borderBottomWidth:1,borderColor:c.line},logo:{width:174,height:46},close:{padding:8,minWidth:44,alignItems:'center'},closeText:{fontSize:30,color:c.navy},contents:{padding:14,paddingBottom:30,gap:22},hint:{fontSize:12,lineHeight:18,color:c.muted},group:{gap:4},groupTitle:{color:c.muted,fontSize:12,fontWeight:'800',textTransform:'uppercase',letterSpacing:1.3,padding:10},row:{minHeight:52,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:12,paddingVertical:10,borderRadius:14},active:{backgroundColor:'#EAF2FF'},icon:{width:26,textAlign:'center',fontSize:22,color:c.blue},label:{flex:1,fontSize:15,fontWeight:'600',color:c.navy},web:{fontSize:10,color:c.muted},arrow:{fontSize:24,color:c.blue}});
