import {ActivityIndicator, Pressable, ScrollView, Text, TextInput, View} from '../components/ThemedNative';
import { useAuth } from '@clerk/expo';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {Alert, Image, KeyboardAvoidingView, Modal, StyleSheet} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { getJson, memberJson, parseListing } from '../api';
import { SellerAccess } from '../components/SellerAccess';
type Category = { name: string; slug: string; subcategories: { name: string; slug: string }[] };
type Quote = { rate: number; sellerFee: number; sellerNet: number; sellerType: string };
export default function Sell() { const { id } = useLocalSearchParams<{id?:string}>(); return <SellerAccess><ListingForm key={id||'new'} id={id} /></SellerAccess>; }
function ListingForm({id}:{id?:string}) {
  const { getToken } = useAuth();
  const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(''); const currency = 'GBP';
  const [category, setCategory] = useState(''); const [sub, setSub] = useState('');
  const [condition, setCondition] = useState('good'); const [photo, setPhoto] = useState('');
  const [categories, setCategories] = useState<Category[]>([]); const [categoryError, setCategoryError] = useState('');
  const [retry, setRetry] = useState(0); const [busy, setBusy] = useState(false); const lock = useRef(false);
  const [error, setError] = useState(''); const [review, setReview] = useState<Quote | null>(null);
  const [initialLoading,setInitialLoading]=useState(Boolean(id));
  const [initialError,setInitialError]=useState('');
  const [initialRetry,setInitialRetry]=useState(0);
  useEffect(()=>{
    if(!id)return;
    const c=new AbortController();
    void(async()=>{
      setInitialLoading(true);setInitialError('');
      try{
        if(!/^\d+$/.test(id))throw Error('Invalid listing.');
        const token=await getToken();if(!token)throw Error('Please sign in again.');
        const row=parseListing(await memberJson(`/mobile/listings/${id}`,token,{signal:c.signal})) as import('../api').Listing & {subcategory?:string;status?:string};
        if(row.currency!=='GBP'||!['active','draft'].includes(row.status||''))throw Error('This listing cannot be edited in the app yet. Use the web dashboard.');
        if(c.signal.aborted)return;
        setTitle(row.title);setDescription(row.description||'');setAmount(String(row.price));setCategory(row.category);setSub(row.subcategory||'');setCondition(row.condition||'good');setPhoto(row.image||'');
      }catch(e){if(!c.signal.aborted)setInitialError(e instanceof Error?e.message:'Could not load listing.');}
      finally{if(!c.signal.aborted)setInitialLoading(false);}
    })();return()=>c.abort();
  },[id,getToken,initialRetry]);
  useEffect(() => {
    const controller = new AbortController();
    void getJson('/mobile/listing-categories', controller.signal).then(data => {
      if (!Array.isArray(data) || data.some(c => typeof c.slug !== 'string' || typeof c.name !== 'string' || !Array.isArray(c.subcategories) || c.subcategories.some((s: {slug?: unknown; name?: unknown}) => typeof s.slug !== 'string' || typeof s.name !== 'string'))) throw new Error('Unexpected categories response.');
      if (!controller.signal.aborted) { setCategories(data); setCategoryError(''); }
    }).catch(() => { if (!controller.signal.aborted) setCategoryError('Could not load categories. Please retry.'); });
    return () => controller.abort();
  }, [retry]);
  async function token() { const value = await getToken(); if (!value) throw new Error('Please sign in again.'); return value; }
  async function choosePhoto(camera: boolean) {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try {
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) throw new Error('Camera permission is needed to take a photo. You can choose a gallery photo instead.');
      const result = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled) return;
      const asset = result.assets[0];
      const ctx = ImageManipulator.manipulate(asset.uri);
      if (asset.width > 1200 || asset.height > 1200) ctx.resize(asset.width >= asset.height ? { width: 1200, height: null } : { width: null, height: 1200 });
      const rendered = await ctx.renderAsync();
      try {
        const image = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
        if (!image.base64 || image.base64.length > 1399977) throw new Error('That photo is too large. Try a smaller image.');
        setPhoto(`data:image/jpeg;base64,${image.base64}`);
      } finally { rendered.release(); ctx.release(); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not prepare your photo.'); }
    finally { lock.current = false; setBusy(false); }
  }
  function validate(publish: boolean) {
    if (title.trim().length < 3) throw new Error('Enter a title with at least 3 characters.');
    if (description.trim().length < 10) throw new Error('Describe your item in at least 10 characters.');
    if (!/^\d{1,8}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) throw new Error('Enter a positive price with up to two decimal places.');
    if (!category) throw new Error('Choose a category.');
    if (publish && !photo) throw new Error('Add a photo before publishing.');
  }
  async function preview() {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try {
      validate(true);
      const q = await memberJson('/stripe/seller-fee-estimate', await token(), { method: 'POST', body: { category, amount } }) as Quote;
      if (!q || ![q.rate, q.sellerFee, q.sellerNet].every(n => typeof n === 'number' && Number.isFinite(n)) || typeof q.sellerType !== 'string') throw new Error('Could not calculate selling fees.');
      setReview(q);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not review listing.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function save(status: 'draft' | 'active') {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try {
      validate(status === 'active');
      const item = parseListing(await memberJson(id ? `/mobile/listings/${id}` : '/mobile/listings', await token(), { method: id ? 'PATCH' : 'POST', body: { title, description, price: amount, currency, category, subcategory: sub, condition, image: photo || null, status } }));
      setReview(null);
      Alert.alert(status === 'active' ? 'Your listing is live' : 'Draft saved', `“${item.title}” is now in your Bazunk listings.`);
      router.replace('/my-listings');
    } catch (e) { setReview(null); setError(`${e instanceof Error ? e.message : 'Could not save listing.'} If the connection was interrupted, check My listings before submitting again.`); }
    finally { lock.current = false; setBusy(false); }
  }
  const selected = categories.find(c => c.slug === category);
  if(initialLoading)return <ActivityIndicator style={{flex:1}} />;
  if(initialError)return <View style={styles.page}><Text style={styles.error}>{initialError}</Text><Action label="Retry listing" onPress={()=>setInitialRetry(n=>n+1)}/></View>;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior="height"><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
    <Text style={styles.title}>{id?'Edit your listing':'Sell something brilliant'}</Text><Text style={styles.copy}>Create a fixed-price listing. Saved listings appear on the website and in admin.</Text>
    <Text style={styles.label}>Main photo</Text>{photo && <Image source={{ uri: photo }} style={{ height: 220, borderRadius: 16 }} resizeMode="contain" />}
    <View style={styles.row}><Action label="Choose photo" disabled={busy} onPress={() => void choosePhoto(false)} /><Action label="Take photo" disabled={busy} onPress={() => void choosePhoto(true)} /></View>
    {!!photo && <Action label="Remove photo" disabled={busy} onPress={() => setPhoto('')} />}
    <Text style={styles.label}>Title</Text><TextInput accessibilityLabel="Listing title" editable={!busy} style={styles.input} value={title} onChangeText={setTitle} maxLength={150} placeholder="What are you selling?" />
    <Text style={styles.label}>Description</Text><TextInput accessibilityLabel="Listing description" editable={!busy} style={[styles.input, { minHeight: 130, textAlignVertical: 'top' }]} multiline value={description} onChangeText={setDescription} maxLength={5000} placeholder="Condition, features and any defects" />
    <Text style={styles.label}>Price</Text><TextInput accessibilityLabel="Item price" editable={!busy} style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="20.00" />
    <Text style={styles.copy}>Listing currency: GBP (£). More selling currencies will follow.</Text>
    <Text style={styles.label}>Category</Text>{categoryError ? <><Text style={styles.error}>{categoryError}</Text><Action label="Retry categories" onPress={() => setRetry(n => n + 1)} /></> : !categories.length ? <ActivityIndicator /> : <ScrollView horizontal><View style={styles.row}>{categories.map(c => <Chip key={c.slug} label={c.name} selected={category === c.slug} disabled={busy} onPress={() => { setCategory(c.slug); setSub(''); }} />)}</View></ScrollView>}
    {!!selected && <><Text style={styles.label}>Subcategory (optional)</Text><ScrollView horizontal><View style={styles.row}><Chip label="None" selected={!sub} disabled={busy} onPress={() => setSub('')} />{selected.subcategories.map(c => <Chip key={c.slug} label={c.name} selected={sub === c.slug} disabled={busy} onPress={() => setSub(c.slug)} />)}</View></ScrollView></>}
    <Text style={styles.label}>Condition</Text><Choices options={['brand-new', 'like-new', 'good', 'fair', 'poor']} value={condition} disabled={busy} onChange={setCondition} />
    <Text style={styles.copy}>Private sellers pay no seller commission. Business selling fees follow your account and admin category rates. Marketplace credits cannot pay business final fees or Buyer Protection.</Text>
    {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}{busy && <ActivityIndicator />}
    <Action label="Review and publish" disabled={busy || !categories.length} onPress={() => void preview()} /><Action label={id?"Save as draft (hide listing)":"Save draft"} disabled={busy || !categories.length} onPress={() => void save('draft')} />
    <Action label="My listings" disabled={busy} onPress={() => router.push('/my-listings')} />
  </ScrollView><Modal visible={!!review} transparent animationType="slide" onRequestClose={() => { if (!busy) setReview(null); }}><SafeAreaView style={styles.overlay}><ScrollView contentContainerStyle={styles.review}>
    <Text style={styles.title}>Ready to publish?</Text><Text style={styles.label}>{title}</Text><Text style={styles.copy}>{currency} {Number(amount).toFixed(2)}</Text>
    {review && <Text style={styles.copy}>{review.sellerType === 'private' ? 'Private seller: no seller commission. Buyer Protection is added for the buyer at checkout.' : `Business seller estimate: ${review.rate}% selling fee (£${review.sellerFee.toFixed(2)}). Estimated item proceeds: £${review.sellerNet.toFixed(2)}. No additional Buyer Protection fee for the buyer.`}</Text>}
    <Text style={styles.copy}>Fee estimates can change before a sale. Delivery, refunds and payment adjustments are excluded.</Text>
    <Action label={busy ? 'Publishing…' : 'Publish listing'} disabled={busy} onPress={() => void save('active')} /><Action label="Back to editing" disabled={busy} onPress={() => setReview(null)} />
  </ScrollView></SafeAreaView></Modal></KeyboardAvoidingView>;
}
function Action({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) { return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, disabled && { opacity: 0.5 }]}><Text style={styles.buttonText}>{label}</Text></Pressable>; }
function Chip({ label, selected, onPress, disabled }: { label: string; selected: boolean; onPress: () => void; disabled: boolean }) { return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={[styles.chip, selected && { backgroundColor: '#1559d6' }]}><Text style={{ color: selected ? '#fff' : '#172442', fontWeight: '600' }}>{label.replace(/-/g, ' ')}</Text></Pressable>; }
function Choices({ options, value, onChange, disabled }: { options: string[]; value: string; onChange: (v: string) => void; disabled: boolean }) { return <View style={styles.row}>{options.map(o => <Chip key={o} label={o} selected={value === o} disabled={disabled} onPress={() => onChange(o)} />)}</View>; }
const styles = StyleSheet.create({ page: { padding: 20, gap: 14, backgroundColor: '#f3f6fc', paddingBottom: 40 }, title: { fontSize: 27, fontWeight: '800', color: '#1559d6' }, copy: { color: '#344563', fontSize: 16, lineHeight: 24 }, label: { fontSize: 17, fontWeight: '700', color: '#172442' }, input: { padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ccd6e7', fontSize: 16, color: '#172442' }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { padding: 13, borderRadius: 12, backgroundColor: '#e0e8fa' }, button: { padding: 17, backgroundColor: '#1559d6', borderRadius: 14, alignItems: 'center' }, buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 }, error: { color: '#ae2339', fontSize: 16 }, overlay: { flex: 1, justifyContent: 'center', backgroundColor: '#0009', padding: 20 }, review: { padding: 24, gap: 20, borderRadius: 20, backgroundColor: '#fff' } });
