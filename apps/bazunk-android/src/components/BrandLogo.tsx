import {useState} from 'react';
import {Image,type ImageStyle} from 'react-native';
import {publicMedia} from '../admin-policy';
import {useMarketplaceSettings} from './MarketplaceSettings';
export function BrandLogo({style}:{style:ImageStyle}){
 const {snapshot}=useMarketplaceSettings();const uri=publicMedia(snapshot?.settings.site_logo_url);
 const [failed,setFailed]=useState<string|undefined>();
 return <Image source={uri&&uri!==failed?{uri}:require('../../assets/logo.png')} style={style} resizeMode="contain" accessibilityLabel={snapshot?.settings.site_name||'Bazunk'} onError={()=>setFailed(uri)}/>;
}

