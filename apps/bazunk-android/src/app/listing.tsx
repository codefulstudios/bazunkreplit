import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  Share,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Button } from "../components/UI";
import { ListingActions } from "../components/ListingActions";
import { loadListing, price, type Listing } from "../api";
import { listingContent } from '../listing-content';
import { openWebsite } from '../components/AppMenu';
export default function Details() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Listing | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    // Reset the previous request state when the listing ID changes.
    const controller = new AbortController();
    // Reset data when the selected listing changes before the request finishes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItem(null);
    setError("");
    loadListing(id || "", controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setItem(data);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Could not load listing.");
      });
    return () => controller.abort();
  }, [id, retry]);
  if (error)
    return (
      <ScrollView contentContainerStyle={s.page}>
        <Text>{error}</Text>
        <Pressable onPress={() => setRetry((v) => v + 1)} style={s.button}>
          <Text style={{ color: "#fff" }}>Retry</Text>
        </Pressable>
      </ScrollView>
    );
  if (!item)
    return (
      <ActivityIndicator style={{ flex: 1 }} size="large" color="#1559d6" />
    );
  const content=listingContent(item);
  const websitePath=`/listing/${encodeURIComponent(item.publicUrlToken||item.publicId||String(item.id))}`;
  return (
    <ScrollView contentContainerStyle={s.page}>
      <ScrollView horizontal pagingEnabled accessibilityLabel="Listing image gallery" showsHorizontalScrollIndicator>{content.images.map((uri,index)=><View key={uri} style={{width:300}}><Image source={{uri}} style={s.image} resizeMode="contain" accessibilityLabel={`${item.title}, image ${index+1} of ${content.images.length}`}/><Text style={{textAlign:'center'}}>{index+1} / {content.images.length}</Text></View>)}</ScrollView>
      {!content.images.length&&<Text>No photos provided.</Text>}
      <Text style={s.title}>{item.title}</Text>
      <Text style={s.price}>{price(item)}</Text>
      <Text>
        {item.condition?.replace(/-/g, " ")} ·{" "}
        {item.category.replace(/-/g, " ")}
      </Text>
      <Text style={s.heading}>Seller</Text>
      <Text>{item.sellerUsername || item.sellerName || "Bazunk seller"}</Text>
      {item.sellerVerified&&<Text>Verified seller</Text>}
      <Button label="Seller details and contact · Website" onPress={()=>void openWebsite(websitePath)}/>
      <Text style={s.heading}>Description</Text>
      <Text style={{ lineHeight: 23 }}>
        {content.description || "No description provided."}
      </Text>

      {!!content.details.length&&<><Text style={s.heading}>Item details</Text>{content.details.map((row,index)=><Text key={index}>{row.name}: {row.value}</Text>)}</>}
      <Text style={s.heading}>Delivery</Text>
      <Text>{item.shippingPrice==null?'Delivery cost not provided. Confirm before buying.':Number(item.shippingPrice)===0?'Delivery included':`Postage: ${price({...item,price:item.shippingPrice})}`}</Text>
      {!!item.handlingCharge&&<Text>Handling: {price({...item,price:item.handlingCharge})}</Text>}
      {item.shipOrigin&&<Text>Ships from: {item.shipOrigin}</Text>}
      {item.shipZone&&<Text>Delivery area: {item.shipZone}</Text>}
      {item.carrier&&<Text>Carrier: {item.carrier}</Text>}
      {content.hasVariations&&<><Text style={s.heading}>Options available</Text><Text>This item has variations. Review the options on the website before buying; the app cart does not yet save a selected variation.</Text></>}
      <ListingActions item={item} />
      <Button label="View listing and options · Website" onPress={()=>void openWebsite(websitePath)}/>
      <Button label="Share listing" onPress={()=>void Share.share({message:`${item.title} https://www.bazunk.com${websitePath}`}).catch(()=>setError('Could not open sharing. Please retry.'))}/>

    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { padding: 20, gap: 16, backgroundColor: "#fff" },
  image: { width: "100%", aspectRatio: 1 },
  title: { fontSize: 24, fontWeight: "700", color: "#172033" },
  price: { color: "#1559d6", fontSize: 30, fontWeight: "700" },
  heading: { fontWeight: "700", fontSize: 18 },
  notice: {
    padding: 16,
    backgroundColor: "#eef3ff",
    color: "#475569",
    borderRadius: 12,
  },
  button: { padding: 16, backgroundColor: "#1559d6", borderRadius: 12 },
});
