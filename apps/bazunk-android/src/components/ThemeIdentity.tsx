import {Pressable,Text,View} from './ThemedNative';
import {useTheme} from '../theme';
import {advertisementUrl} from '../advertising';
import * as WebBrowser from 'expo-web-browser';
import {Alert} from 'react-native';
const icons:Record<string,string>={home:'⌂',search:'⌕',cart:'🛒',account:'👤',heart:'♡',package:'📦',store:'▤',menu:'☰',star:'★',bell:'♧',message:'✉',mail:'✉',globe:'◎',categories:'▦',facebook:'f',instagram:'◎',youtube:'▶',twitter:'𝕏',shield:'✓'};
export function ThemeIcon({placement,fallback}:{placement:string;fallback:string}){const {settings}=useTheme();let choice=fallback;try{const raw=JSON.parse(settings.icon_overrides||'{}');if(typeof raw[placement]==='string'&&icons[raw[placement]])choice=raw[placement]}catch{}return <Text style={{fontSize:22}}>{icons[choice]||icons[fallback]}</Text>}
export function ThemeSocialLinks(){const {settings}=useTheme();return <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{['facebook','twitter','instagram','youtube'].map(name=>{const url=advertisementUrl(settings['footer_'+name]||'');return url?<Pressable key={name} accessibilityRole="link" accessibilityLabel={`Bazunk on ${name}, opens browser`} onPress={()=>void WebBrowser.openBrowserAsync(url).catch(()=>Alert.alert('Could not open link','Please try again.'))} style={{padding:12,minHeight:44}}><ThemeIcon placement={'footer_'+name} fallback={name}/><Text>{name==='twitter'?'X':name}</Text></Pressable>:null})}</View>}
