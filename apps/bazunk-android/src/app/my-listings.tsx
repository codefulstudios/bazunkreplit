import { useAuth } from "@clerk/expo";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { memberJson, parseOwnListings, price, type OwnListing } from "../api";
import { useMemberRequest } from "../hooks";
import { Button } from "../components/UI";
import { SellerAccess } from "../components/SellerAccess";
export default function MyListings() {
  return (
    <SellerAccess>
      <Inventory />
    </SellerAccess>
  );
}
function Inventory() {
  const { getToken } = useAuth();
  const request = useMemberRequest();
  const [actionBusy, setActionBusy] = useState(false);
  const [items, setItems] = useState<OwnListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [more, setMore] = useState(true);
  const generation = useRef(0);
  const busy = useRef(false);
  const offset = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(
    async (reset: boolean) => {
      if (!reset && busy.current) return;
      const version = ++generation.current;
      controller.current?.abort();
      const request = new AbortController();
      controller.current = request;
      busy.current = true;
      setLoading(true);
      setError("");
      if (reset) {
        setItems([]);
        offset.current = 0;
      }
      try {
        const token = await getToken();
        if (!token) throw new Error("Please sign in again.");
        const rows = parseOwnListings(
          await memberJson(
            `/mobile/listings/mine?offset=${reset ? 0 : offset.current}`,
            token,
            { signal: request.signal },
          ),
        );
        if (version !== generation.current) return;
        setItems((prev) =>
          reset
            ? rows
            : [
                ...prev,
                ...rows.filter((r) => !prev.some((p) => p.id === r.id)),
              ],
        );
        offset.current += rows.length;
        setMore(rows.length === 25);
      } catch (e) {
        if (version === generation.current && !request.signal.aborted)
          setError(e instanceof Error ? e.message : "Could not load listings.");
      } finally {
        if (version === generation.current) {
          setLoading(false);
          busy.current = false;
        }
      }
    },
    [getToken],
  );
  useFocusEffect(
    useCallback(() => {
      void load(true);
      return () => {
        generation.current++;
        controller.current?.abort();
        busy.current = false;
      };
    }, [load]),
  );
  async function archive(id: number) {
    if (actionBusy) return;
    setActionBusy(true);
    setError("");
    try {
      await request(`/mobile/listings/${id}`, { method: "DELETE" });
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not archive listing.");
    } finally {
      setActionBusy(false);
    }
  }
  return (
    <FlatList
      style={{ backgroundColor: "#f3f6fc" }}
      contentContainerStyle={styles.page}
      data={items}
      keyExtractor={(item) => String(item.id)}
      refreshing={loading}
      onRefresh={() => void load(true)}
      ListHeaderComponent={
        <View style={{ gap: 14, marginBottom: 20 }}>
          <Text style={styles.title}>My listings</Text>
          <Text style={styles.copy}>
            Your inventory from the same Bazunk marketplace, including drafts.
            Pull down to refresh.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={styles.button}
            onPress={() => router.push("/sell")}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              Create a listing
            </Text>
          </Pressable>
          {error && (
            <>
              <Text
                accessibilityLiveRegion="polite"
                style={{ color: "#ae2339" }}
              >
                {error}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void load(items.length === 0)}
              >
                <Text style={styles.link}>Retry</Text>
              </Pressable>
            </>
          )}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator />
        ) : !error ? (
          <Text style={styles.copy}>You have no listings yet.</Text>
        ) : null
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          {item.image && (
            <Image
              source={{ uri: item.image }}
              style={{ width: 80, height: 80, borderRadius: 12 }}
            />
          )}
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={styles.name}>{item.title}</Text>
            <Text style={styles.link}>{price(item)}</Text>
            <Text style={styles.copy}>{item.status.replace(/-/g, " ")}</Text>
            {item.status === "active" ? (
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: "/listing", params: { id: item.id } })
                }
              >
                <Text style={styles.link}>View listing</Text>
              </Pressable>
            ) : null}
            <Button
              label="Manage stock"
              disabled={actionBusy}
              onPress={() =>
                router.push({
                  pathname: "/stock",
                  params: { id: String(item.id) },
                })
              }
            />
            {["active", "draft"].includes(item.status) && (
              <>
                <Button
                  label="Edit / publish"
                  disabled={actionBusy}
                  onPress={() =>
                    router.push({ pathname: "/sell", params: { id: item.id } })
                  }
                />
                <Button
                  label="Archive listing"
                  disabled={actionBusy}
                  onPress={() =>
                    Alert.alert(
                      "Archive this listing?",
                      "It will be hidden from buyers and kept in your inventory.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Archive",
                          style: "destructive",
                          onPress: () => void archive(item.id),
                        },
                      ],
                    )
                  }
                />
              </>
            )}
          </View>
        </View>
      )}
      ListFooterComponent={
        items.length > 0 && more ? (
          <Pressable
            accessibilityRole="button"
            disabled={loading}
            style={styles.button}
            onPress={() => void load(false)}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                Load more
              </Text>
            )}
          </Pressable>
        ) : null
      }
    />
  );
}
const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40 },
  title: { color: "#1559d6", fontSize: 27, fontWeight: "800" },
  copy: { color: "#344563", fontSize: 15, lineHeight: 22 },
  button: {
    backgroundColor: "#1559d6",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  card: {
    flexDirection: "row",
    gap: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  name: { color: "#172442", fontSize: 18, fontWeight: "700" },
  link: { color: "#1559d6", fontSize: 16, fontWeight: "700" },
});
