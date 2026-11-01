import {useEffect,useState,type ReactNode} from 'react';
import {AccessibilityInfo,ActivityIndicator,Animated,Image,StyleSheet,Text,View} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import {palette as c} from '../storefront';
// Retain the OS splash only until the local branded view is laid out.
void SplashScreen.preventAutoHideAsync().catch(()=>{});
export function Startup({children}:{children:ReactNode}){
 const [visible,setVisible]=useState(true);const [imageReady,setImageReady]=useState(false);const [laidOut,setLaidOut]=useState(false);const [opacity]=useState(()=>new Animated.Value(1));
 useEffect(()=>{if(!imageReady||!laidOut)return;let live=true;void AccessibilityInfo.isReduceMotionEnabled().catch(()=>true).then(reduced=>{if(!live)return;Animated.timing(opacity,{toValue:0,duration:reduced?0:420,useNativeDriver:true}).start(({finished})=>{if(finished&&live)setVisible(false)})});return()=>{live=false;opacity.stopAnimation()}},[imageReady,laidOut,opacity]);
 useEffect(()=>{const timeout=setTimeout(()=>{void SplashScreen.hideAsync().catch(()=>{});setVisible(false)},3000);return()=>clearTimeout(timeout)},[]);
 return <View style={s.root} onLayout={()=>setLaidOut(true)}><View style={s.root} accessibilityElementsHidden={visible} importantForAccessibility={visible?'no-hide-descendants':'auto'}>{children}</View>{visible&&<Animated.View style={[s.cover,{opacity}]} onLayout={()=>void SplashScreen.hideAsync().catch(()=>{})} accessibilityLabel="Loading Bazunk" accessibilityRole="progressbar"><Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" onLoadEnd={()=>setImageReady(true)}/><Text style={s.copy}>Buy. Sell. Discover.</Text><ActivityIndicator color={c.orange} style={{marginTop:26}}/></Animated.View>}</View>
}
const s=StyleSheet.create({root:{flex:1},cover:{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'#fff',alignItems:'center',justifyContent:'center',zIndex:100},logo:{width:'72%',maxWidth:300,height:84},copy:{color:c.muted,fontSize:16,marginTop:12,letterSpacing:1}});
