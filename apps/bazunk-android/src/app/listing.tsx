import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "../components/UI";
import { StockStatus } from "../components/StockStatus";
import { ListingActions } from "../components/ListingActions";
import { getJson, parseListing, price, type Listing } from "../api";
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
    getJson(`/listings/${encodeURIComponent(id || "")}`, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setItem(parseListing(data));
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
  return (
    <ScrollView contentContainerStyle={s.page}>
      {item.image && (
        <Image
          source={{ uri: item.image }}
          style={s.image}
          resizeMode="contain"
        />
      )}
      <Text style={s.title}>{item.title}</Text>
      <Text style={s.price}>{price(item)}</Text>
      <Text>
        {item.condition?.replace(/-/g, " ")} ·{" "}
        {item.category.replace(/-/g, " ")}
      </Text>
      <Text style={s.heading}>Seller</Text>
      <Text>{item.sellerUsername || item.sellerName || "Bazunk seller"}</Text>
      <Button
        label="Seller reputation and reviews"
        onPress={() =>
          router.push({ pathname: "/seller-reviews", params: { id: item.id } })
        }
      />
      <Text style={s.heading}>Description</Text>
      <Text style={{ lineHeight: 23 }}>
        {item.description || "No description provided."}
      </Text>
      <StockStatus id={item.id} />
      <ListingActions item={item} />
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
