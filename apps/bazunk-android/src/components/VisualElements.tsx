import {Image,Pressable,Text,View,type TextStyle,type ViewStyle} from 'react-native';
import {parseVisualElements} from '../visual-elements';
import {readableText} from '../theme-colors';
import {designContrast} from '../design-palette';
import {useTheme} from '../theme';
import {publicMedia,safeWebsitePath,allowedRoute} from '../admin-policy';
import {openWebsite} from './AppMenu';
const bounded=(v:unknown,min:number,max:number,fallback:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
export function VisualElements(){
 const {settings,mode,palette:p}=useTheme();
 return <View style={{gap:16}}>{parseVisualElements(settings.visual_elements_v1).filter(e=>!e.hidden).map(e=>{
  const s={...e.style,...e.responsive?.mobile};const colors=e.themeColors?.[mode]||e.themeColors?.light;
  const bg=/^#[\da-f]{6}$/i.test(colors?.background||e.background)?(colors?.background||e.background):p.surface;
  const requested=colors?.color||e.color;const fg=/^#[\da-f]{6}$/i.test(requested)&&designContrast(requested,bg)>=4.5?requested:designContrast(p.text,bg)>=4.5?p.text:designContrast('#ffffff',bg)>=4.5?'#ffffff':'#111111';
  const box:ViewStyle={backgroundColor:bg,padding:bounded(s.padding,0,48,16),gap:bounded(s.gap,0,32,12),borderRadius:bounded(s.borderRadius,0,48,16),borderWidth:bounded(s.borderWidth,0,6,0),borderColor:/^#[\da-f]{6}$/i.test(s.borderColor||'')?s.borderColor:p.field,width:`${bounded(s.width,20,100,100)}%`,alignSelf:'center',marginVertical:bounded(s.sectionSpacing,0,48,0),elevation:s.shadow==='large'?10:s.shadow==='medium'?6:s.shadow==='small'?2:0};
  if(e.type==='button'&&(s.buttonVariant==='outline'||s.buttonVariant==='ghost')){box.backgroundColor=p.background;box.borderWidth=s.buttonVariant==='outline'?2:0;box.borderColor=fg;}
  const text:TextStyle={color:readableText(fg,String(box.backgroundColor)),fontSize:bounded(s.fontSize,12,40,e.type==='heading'?26:16),fontWeight:bounded(s.fontWeight,100,900,e.type==='heading'?700:400) as TextStyle['fontWeight'],lineHeight:bounded(s.fontSize,12,40,e.type==='heading'?26:16)*1.45,textAlign:s.align==='center'?'center':s.align==='right'?'right':'left',fontFamily:['sans-serif','serif','monospace'].includes(s.fontFamily||'')?s.fontFamily:undefined};
  const media=publicMedia(e.image),path=safeWebsitePath(e.url||'/');
  const content=<>{media&&<Image source={{uri:media}} style={{width:'100%',height:bounded(s.imageHeight,60,400,180),borderRadius:box.borderRadius}} resizeMode={s.imageFit==='contain'?'contain':s.imageFit==='fill'?'stretch':'cover'}/>}<Text style={text}>{e.text}</Text></>;
  return e.url&&allowedRoute(settings,path)?<Pressable accessibilityRole="link" key={e.id} onPress={()=>void openWebsite(path)} style={box}>{content}</Pressable>:<View key={e.id} style={box}>{content}</View>;
 })}</View>;
}
