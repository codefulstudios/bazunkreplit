import {createContext,useCallback,useContext,useEffect,useState,type ReactNode} from 'react';
import {ActivityIndicator,AppState,Pressable,Text,View} from 'react-native';
import {router,usePathname} from 'expo-router';
import {getJson} from '../api';
import {parsePublicSettings,routeFeature,type PublicSettings} from '../admin-policy';
import {buildTaxonomy,type CategoryNode} from '../taxonomy';
type Snapshot={settings:PublicSettings;categories:CategoryNode[]};
type State={snapshot:Snapshot|null;error:string;refresh:()=>void};
const Context=createContext<State>({snapshot:null,error:'',refresh:()=>{}});
export const useMarketplaceSettings=()=>useContext(Context);
export function MarketplaceSettings({children}:{children:ReactNode}){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
 const [error,setError]=useState('');const [categories,setCategories]=useState<CategoryNode[]>([]);const [categoryError,setCategoryError]=useState('');const [revision,setRevision]=useState(0);
 const refresh=useCallback(()=>setRevision(n=>n+1),[]);
 useEffect(()=>{
  const controller=new AbortController();
  void getJson('/settings/public',controller.signal).then(parsePublicSettings).then(settings=>{
   if(!controller.signal.aborted){setSnapshot(previous=>({settings,categories:previous?.categories||[]}));setError('')}
  }).catch(()=>{if(!controller.signal.aborted)setError('Could not refresh marketplace controls. Please reconnect and retry.')});
  void Promise.all(['/taxonomy/category-overrides','/taxonomy/third-level','/settings/category-visibility'].map(path=>getJson(path,controller.signal))).then(([overrides,third,visibility])=>{
   const categories=buildTaxonomy(overrides,third,visibility);
   if(!controller.signal.aborted){setCategories(categories);setCategoryError('')}
  }).catch(()=>{if(!controller.signal.aborted){setCategories([]);setCategoryError('Categories could not refresh. Tap to retry.')}});
  return()=>controller.abort();
 },[revision]);
 useEffect(()=>{
  const subscription=AppState.addEventListener('change',state=>{if(state==='active')refresh()});
  const timer=setInterval(()=>{if(AppState.currentState==='active')refresh()},60000);
  return()=>{subscription.remove();clearInterval(timer)};
 },[refresh]);
 return <Context.Provider value={{snapshot:snapshot?{settings:snapshot.settings,categories}:null,error:error||categoryError,refresh}}>{children}</Context.Provider>;
}
export function MarketplaceGate({children}:{children:ReactNode}){
 const {snapshot,error,refresh}=useMarketplaceSettings();const pathname=usePathname();
 const feature=routeFeature(pathname);
 const maintenance=snapshot?.settings.maintenance_mode==='true';
 const disabled=!!feature&&snapshot?.settings['feature_'+feature]==='false';
 const blocked=!snapshot||maintenance||disabled;
 return <View style={{flex:1}}><View style={{flex:1}} pointerEvents={blocked?'none':'auto'} accessibilityElementsHidden={blocked} importantForAccessibility={blocked?'no-hide-descendants':'auto'}>{children}</View>{blocked?<View style={{position:'absolute',top:0,left:0,right:0,bottom:0,justifyContent:'center',padding:28,gap:20,backgroundColor:'#fff'}}>
  {!snapshot&&!error?<ActivityIndicator accessibilityLabel="Loading marketplace settings"/>:<Text accessibilityRole="header" style={{fontSize:24,fontWeight:'700',color:'#102A56'}}>{maintenance?'Bazunk is undergoing maintenance':disabled?'This feature is temporarily unavailable':'Unable to connect to Bazunk'}</Text>}
  <Text style={{color:'#344563'}}>{error|| (maintenance?'Please check back shortly.':disabled?'This feature has been turned off by the marketplace.':'Loading marketplace controls…')}</Text>
  <Pressable accessibilityRole="button" onPress={refresh} style={{padding:16}}><Text style={{color:'#175CD3'}}>Retry</Text></Pressable>
  {disabled&&<Pressable accessibilityRole="button" onPress={()=>router.replace('/')} style={{padding:16}}><Text style={{color:'#175CD3'}}>Back to home</Text></Pressable>}
 </View>:!!error&&<Pressable accessibilityRole="button" onPress={refresh} style={{padding:12,backgroundColor:'#FFF0DF'}}><Text style={{color:'#79390B'}}>{error} Showing the last saved controls. Tap to retry.</Text></Pressable>}</View>;
}
