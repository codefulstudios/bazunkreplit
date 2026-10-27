import {BrandLogo} from '../components/BrandLogo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { cataloguePath } from '../taxonomy';
import { getJson, parseListings, price, type Listing } from '../api';

import {useMarketplaceSettings} from '../components/MarketplaceSettings';
export default function Browse() {
  const {snapshot}=useMarketplaceSettings();
  const params=useLocalSearchParams<{category?:string;q?:string}>();
  return <BrowseResults key={`${params.category||''}:${params.q||''}:${JSON.stringify(snapshot?.categories)}`} params={params}/>;
}
function BrowseResults({params}:{params:{category?:string;q?:string}}){
  const [items, setItems] = useState<Listing[]>([]);
  const {snapshot,refresh}=useMarketplaceSettings();
  const categories=snapshot?.categories||[];
  const [category, setCategory] = useState(categories.some(c=>c.slug===params.category)?params.category||'':'');
  const [sub,setSub]=useState('');
  const [third,setThird]=useState('');

  const [query, setQuery] = useState(params.q||'');
  const [submitted,setSubmitted]=useState(params.q||'');
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const banner=snapshot?.settings.announcement_enabled==='true'?snapshot.settings.announcement_text:'';
  const request = useRef(0);
  const busy = useRef(false);
  const offset = useRef(0);
  const load = useCallback(async (reset: boolean) => {
    if (!reset && busy.current) return;
    const version = ++request.current;
    busy.current = true; setLoading(true); setError('');
    if (reset) { offset.current = 0; setItems([]); }
    try {
      const rows = parseListings(await getJson(cataloguePath(category,sub,third,submitted,reset?0:offset.current)));
      if (version !== request.current) return;
      setItems(prev => reset ? rows : [...prev, ...rows.filter(row => !prev.some(p => p.id === row.id))]);
      offset.current += rows.length; setMore(rows.length === 24);
    } catch (e) { if (version === request.current) setError(e instanceof Error ? e.message : 'Unable to connect. Please retry.'); }
    finally { if (version === request.current) { setLoading(false); busy.current = false; } }
  }, [category,sub,third,submitted]);
  // Fetching a changed category intentionally resets the network loading state.
  // The ref is a request counter, not a DOM ref; incrementing at cleanup invalidates stale responses.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(true); return () => { request.current++; busy.current = false; }; }, [load, retry]);
  const visible = items;
  return <View style={s.page}>
    <View style={s.header}><BrandLogo style={s.logo}/>{!!banner&&<Text style={s.banner}>{banner}</Text>}</View>
    <TextInput style={s.search} value={query} onChangeText={setQuery} placeholder="Search all listings…" accessibilityLabel="Search all listings" returnKeyType="search" onSubmitEditing={()=>setSubmitted(query.trim())} />
    <Pressable accessibilityRole="button" style={s.chip} onPress={()=>setSubmitted(query.trim())}><Text>Search catalogue</Text></Pressable>
    {([{label:'Category',nodes:categories,value:category,choose:(value:string)=>{setCategory(value);setSub('');setThird('')}},...(category?[{label:'Subcategory',nodes:categories.find(c=>c.slug===category)?.children||[],value:sub,choose:(value:string)=>{setSub(value);setThird('')}}]:[]),...(sub?[{label:'Sub-subcategory',nodes:categories.find(c=>c.slug===category)?.children.find(c=>c.slug===sub)?.children||[],value:third,choose:setThird}]:[])]).map(level=><View key={level.label}><Text style={{paddingHorizontal:16,fontWeight:'700'}}>{level.label}</Text><ScrollView horizontal style={{flexGrow:0}} contentContainerStyle={{padding:12,gap:8}} showsHorizontalScrollIndicator={false}>{[{slug:'',name:'All',children:[]},...level.nodes].map(c=><Pressable key={c.slug} accessibilityRole="button" accessibilityState={{selected:c.slug===level.value}} style={[s.chip,c.slug===level.value&&s.selected]} onPress={()=>level.choose(c.slug)}><Text style={{color:c.slug===level.value?'#fff':'#1559d6'}}>{c.name}</Text></Pressable>)}</ScrollView></View>)}
    <FlatList data={visible} numColumns={2} keyExtractor={item => String(item.id)} contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 30 }} columnWrapperStyle={{ gap: 12 }} refreshing={loading && items.length === 0} onRefresh={() => {refresh();setRetry(v => v + 1)}} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.title}`} onPress={() => router.push({ pathname: '/listing', params: { id: item.publicUrlToken || item.publicId || String(item.id) } })} style={s.card}>{item.image ? <Image source={{ uri: item.image }} style={s.photo} resizeMode="contain" /> : <View style={s.photo}><Text>No image</Text></View>}<Text numberOfLines={2} style={s.title}>{item.title}</Text><Text style={s.price}>{price(item)}</Text><Text style={s.condition}>{item.condition || 'View details'}</Text>{!!item.promotions?.length && <Text style={s.promoted}>Promoted</Text>}</Pressable>} ListEmptyComponent={!loading && !error ? <Text style={s.empty}>{query ? 'No listings match your search. Try another term.' : 'No listings available in this category.'}</Text> : null} ListFooterComponent={<View style={{ gap: 12 }}>{loading && <ActivityIndicator size="large" color="#1559d6" />}{!!error && <><Text accessibilityRole="alert" style={s.empty}>{error}</Text><Pressable style={s.button} onPress={() => items.length ? void load(false) : setRetry(v => v + 1)}><Text style={s.white}>Retry</Text></Pressable></>}{!loading && !error && more && <Pressable style={s.button} onPress={() => void load(false)}><Text style={s.white}>Load more listings</Text></Pressable>}</View>} />
  </View>;
}
const s = StyleSheet.create({ page: { flex: 1, backgroundColor: '#f4f7fc' }, header: { padding: 16, gap: 12, backgroundColor: '#fff' }, logo: { width: 175, height: 40 }, banner: { color: '#334155', fontSize: 14 }, search: { margin: 16, padding: 12, backgroundColor: '#fff', borderRadius: 12, fontSize: 16 }, chip: { borderRadius: 20, padding: 12, backgroundColor: '#e8efff' }, selected: { backgroundColor: '#1559d6' }, card: { flex: 1, maxWidth: '50%', padding: 12, backgroundColor: '#fff', borderRadius: 16, gap: 8 }, photo: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }, title: { fontWeight: '600', color: '#172033' }, price: { fontSize: 19, fontWeight: '700', color: '#1559d6' }, condition: { fontSize: 12, color: '#64748b' }, promoted: { color: '#8b3ac5', fontSize: 12 }, empty: { padding: 16, textAlign: 'center', color: '#475569' }, button: { margin: 12, backgroundColor: '#1559d6', padding: 16, borderRadius: 12, alignItems: 'center' }, white: { color: '#fff', fontWeight: '700' } });
