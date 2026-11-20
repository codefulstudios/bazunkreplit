import {useState} from 'react';
import {router} from 'expo-router';
import {Image} from 'react-native';
import {ActivityIndicator,ScrollView,Text,View} from '../components/ThemedNative';
import {SellerAccess} from '../components/SellerAccess';
import {Button,ui} from '../components/UI';
import {useMemberData} from '../hooks';
import {parseMemberOrders,orderMoney} from '../member-contracts';
export default function Orders(){return <SellerAccess><OrdersList/></SellerAccess>}
function OrdersList(){const [role,setRole]=useState<'buyer'|'seller'>('buyer'),[page,setPage]=useState(0);const {data,error,loading,reload}=useMemberData(role==='buyer'?'/orders':'/orders/seller',parseMemberOrders);const rows=data?.slice(page*25,(page+1)*25);return <ScrollView contentContainerStyle={ui.page}><Text style={ui.title}>{role==='buyer'?'My purchases':'My sales'}</Text><Button label={role==='buyer'?'Show sales':'Show purchases'} onPress={()=>{setRole(r=>r==='buyer'?'seller':'buyer');setPage(0)}}/><Button label="Refresh orders" onPress={reload}/>{loading&&<ActivityIndicator/>}{!!error&&<Text accessibilityRole="alert">{error}</Text>}{rows?.length===0&&<Text>No orders to show.</Text>}{rows?.map(o=><View key={o.id} style={ui.card}>{!!o.image&&<Image source={{uri:o.image}} style={{height:140}} resizeMode="contain"/>}<Text style={ui.title}>{o.title}</Text><Text>{o.id} · {o.status.replace(/_/g,' ')}</Text><Text>{role==='buyer'?'Order total':'Seller proceeds'}: {orderMoney(role==='buyer'?o.buyerTotal:o.sellerNet,o.currency)}</Text><Button label="Order details" onPress={()=>router.push({pathname:'/order-details',params:{id:o.id}})}/></View>)}{page>0&&<Button label="Previous page" onPress={()=>setPage(p=>p-1)}/>} {!!data&&data.length>(page+1)*25&&<Button label="Next page" onPress={()=>setPage(p=>p+1)}/>}<Text style={ui.copy}>Sales show the latest 300 orders available from the server.</Text></ScrollView>}
