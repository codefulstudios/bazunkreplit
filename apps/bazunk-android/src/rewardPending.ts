import * as SecureStore from 'expo-secure-store';
import {parsePending,type PendingPlay} from './rewards';
const key=(userId:string)=>`bazunk-reward-play-${userId}`;
let queue:Promise<unknown>=Promise.resolve();
function serial<T>(work:()=>Promise<T>):Promise<T>{const result=queue.then(work,work);queue=result.catch(()=>{});return result}
async function read(userId:string):Promise<PendingPlay|null>{const raw=await SecureStore.getItemAsync(key(userId));return raw?parsePending(JSON.parse(raw)):null}
export function readPendingPlay(userId:string){return serial(()=>read(userId))}
export function savePendingPlay(userId:string,play:PendingPlay){return serial(async()=>{const prior=await read(userId);if(prior){if(prior.gameId!==play.gameId)throw Error('Recover your pending game before playing another.');return prior}await SecureStore.setItemAsync(key(userId),JSON.stringify(play));return play})}
export function clearPendingPlay(userId:string,requestId:string){return serial(async()=>{const current=await read(userId);if(current?.requestId===requestId)await SecureStore.deleteItemAsync(key(userId))})}
export function newPlay(gameId:string,day:number,answer?:number):PendingPlay{return{gameId,day,answer,requestId:`play-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`}}
