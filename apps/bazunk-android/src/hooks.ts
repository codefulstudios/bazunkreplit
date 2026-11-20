import {useAuth} from '@clerk/expo';
import {useFocusEffect} from 'expo-router';
import {useCallback,useState} from 'react';
import {memberJson} from './api';
export function useMemberRequest(){const {getToken}=useAuth();return useCallback(async(path:string,options:Parameters<typeof memberJson>[2]={})=>{const token=await getToken();if(!token)throw Error('Please sign in again.');return memberJson(path,token,options)},[getToken]);}
export function useMemberData<T>(path:string,parse:(data:unknown)=>T,enabled=true){
 const request=useMemberRequest();const [data,setData]=useState<T|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [retry,setRetry]=useState(0);
 useFocusEffect(useCallback(()=>{const c=new AbortController();setLoading(enabled);setError('');setData(null);if(!enabled)return()=>c.abort();void request(`${path}${path.includes('?')?'&':'?'}refresh=${retry}`,{signal:c.signal}).then(x=>{const parsed=parse(x);if(!c.signal.aborted)setData(parsed)}).catch(e=>{if(!c.signal.aborted)setError(e instanceof Error?e.message:'Could not load data.')}).finally(()=>{if(!c.signal.aborted)setLoading(false)});return()=>c.abort()},[path,parse,request,retry,enabled]));
 return {data,error,loading,reload:()=>setRetry(n=>n+1)};
}
export function useMemberLoader<T>(loader:(request:ReturnType<typeof useMemberRequest>,signal:AbortSignal,revision:number)=>Promise<T>){
 const request=useMemberRequest();const [data,setData]=useState<T|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
 useFocusEffect(useCallback(()=>{const c=new AbortController();setLoading(true);setError('');setData(null);void loader(request,c.signal,revision).then(value=>{if(!c.signal.aborted)setData(value)}).catch(e=>{if(!c.signal.aborted)setError(e instanceof Error?e.message:'Could not load account data.')}).finally(()=>{if(!c.signal.aborted)setLoading(false)});return()=>c.abort()},[request,loader,revision]));
 return {data,error,loading,reload:()=>setRevision(n=>n+1)};
}
