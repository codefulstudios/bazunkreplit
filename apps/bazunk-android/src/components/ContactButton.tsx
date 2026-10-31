import {Text, View} from './ThemedNative';
import * as Linking from 'expo-linking';
import {useState} from 'react';

import {contactUrl} from '../specials';
import {Button,ui} from './UI';
export function ContactButton({kind,value,title}:{kind:'email'|'phone'|'website';value:string;title:string}){const [error,setError]=useState(''),[busy,setBusy]=useState(false);async function open(){setBusy(true);setError('');try{await Linking.openURL(contactUrl(kind,value,title))}catch{setError(`Could not open ${kind}. Check that a suitable app is installed.`)}finally{setBusy(false)}}return <View style={{gap:8}}><Button label={kind==='email'?`Email ${value}`:kind==='phone'?`Call ${value}`:'Open advertised website'} disabled={busy} onPress={()=>void open()}/>{!!error&&<Text style={ui.error}>{error}</Text>}</View>}
