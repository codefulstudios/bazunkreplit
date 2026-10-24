import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { getJson, parseListings, price, type Listing } from '../api';

export default function Browse() {
  const [items, setItems] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [banner, setBanner] = useState('Buy, sell and discover something brilliant.');
  const request = useRef(0);
  const busy = useRef(false);
  const offset = useRef(0);
  const load = useCallback(async (reset: boolean) => {
    if (!reset && busy.current) return;
    const version = ++request.current;
    busy.current = true; setLoading(true); setError('');
    if (reset) { offset.current = 0; setItems([]); }
    try {
      const rows = parseListings(await getJson(`/listings?limit=24&offset=${reset ? 0 : offset.current}&category=${encodeURIComponent(category)}`));
      if (version !== request.current) return;
      setItems(prev => reset ? rows : [...prev, ...rows.filter(row => !prev.some(p => p.id === row.id))]);
      offset.current += rows.length; setMore(rows.length === 24);
    } catch (e) { if (version === request.current) setError(e instanceof Error ? e.message : 'Unable to connect. Please retry.'); }
    finally { if (version === request.current) { setLoading(false); busy.current = false; } }
  }, [category]);
  // Fetching a changed category intentionally resets the network loading state.
  // The ref is a request counter, not a DOM ref; incrementing at cleanup invalidates stale responses.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(true); return () => { request.current++; busy.current = false; }; }, [load, retry]);
  useEffect(() => {
    const controller = new AbortController();
    getJson('/listings/category-counts', controller.signal).then(data => { if (Array.isArray(data)) setCategories([...new Set(data.map(row => String(row.category)))].sort()); }).catch(() => {});
    getJson('/settings/public', controller.signal).then(data => { const value = (data as Record<string, string>)?.announcement_text; if (typeof value === 'string' && value) setBanner(value); }).catch(() => {});
    return () => controller.abort();
  }, []);
  const visible = items.filter(item => item.title.toLowerCase().includes(query.toLowerCase()));
  return <View style={s.page}>
    <View style={s.header}><Image source={require('../../assets/logo.png')} style={s.logo} resizeMode="contain" /><Text style={s.banner}>{banner}</Text></View>
    <TextInput style={s.search} value={query} onChangeText={setQuery} placeholder="Filter loaded listings…" accessibilityLabel="Filter loaded listings by title" />
    <ScrollView horizontal style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }} showsHorizontalScrollIndicator={false}>{['', ...categories].map(c => <Pressable key={c} onPress={() => setCategory(c)} style={[s.chip, c === category && s.selected]} accessibilityRole="button" accessibilityState={{ selected: c === category }}><Text style={{ color: c === category ? '#fff' : '#1559d6' }}>{c ? c.replace(/-/g, ' ') : 'All categories'}</Text></Pressable>)}</ScrollView>
    <FlatList data={visible} numColumns={2} keyExtractor={item => String(item.id)} contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 30 }} columnWrapperStyle={{ gap: 12 }} refreshing={loading && items.length === 0} onRefresh={() => setRetry(v => v + 1)} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.title}`} onPress={() => router.push({ pathname: '/listing', params: { id: item.id } })} style={s.card}>{item.image ? <Image source={{ uri: item.image }} style={s.photo} resizeMode="contain" /> : <View style={s.photo}><Text>No image</Text></View>}<Text numberOfLines={2} style={s.title}>{item.title}</Text><Text style={s.price}>{price(item)}</Text><Text style={s.condition}>{item.condition || 'View details'}</Text>{!!item.promotions?.length && <Text style={s.promoted}>Promoted</Text>}</Pressable>} ListEmptyComponent={!loading && !error ? <Text style={s.empty}>{query ? 'No matches in the loaded listings. Load more or change your filter.' : 'No listings available in this category.'}</Text> : null} ListFooterComponent={<View style={{ gap: 12 }}>{loading && <ActivityIndicator size="large" color="#1559d6" />}{!!error && <><Text accessibilityRole="alert" style={s.empty}>{error}</Text><Pressable style={s.button} onPress={() => items.length ? void load(false) : setRetry(v => v + 1)}><Text style={s.white}>Retry</Text></Pressable></>}{!loading && !error && more && <Pressable style={s.button} onPress={() => void load(false)}><Text style={s.white}>Load more listings</Text></Pressable>}</View>} />
  </View>;
}
const s = StyleSheet.create({ page: { flex: 1, backgroundColor: '#f4f7fc' }, header: { padding: 16, gap: 12, backgroundColor: '#fff' }, logo: { width: 175, height: 40 }, banner: { color: '#334155', fontSize: 14 }, search: { margin: 16, padding: 12, backgroundColor: '#fff', borderRadius: 12, fontSize: 16 }, chip: { borderRadius: 20, padding: 12, backgroundColor: '#e8efff' }, selected: { backgroundColor: '#1559d6' }, card: { flex: 1, maxWidth: '50%', padding: 12, backgroundColor: '#fff', borderRadius: 16, gap: 8 }, photo: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }, title: { fontWeight: '600', color: '#172033' }, price: { fontSize: 19, fontWeight: '700', color: '#1559d6' }, condition: { fontSize: 12, color: '#64748b' }, promoted: { color: '#8b3ac5', fontSize: 12 }, empty: { padding: 16, textAlign: 'center', color: '#475569' }, button: { margin: 12, backgroundColor: '#1559d6', padding: 16, borderRadius: 12, alignItems: 'center' }, white: { color: '#fff', fontWeight: '700' } });
