import {ActivityIndicator, ScrollView, Text, View} from '../components/ThemedNative';
import { router } from "expo-router";
import { useRef, useState } from "react";
import {Image} from 'react-native';
import { parseListings, price } from "../api";
import { useMemberData, useMemberRequest } from "../hooks";
import { SellerAccess } from "../components/SellerAccess";
import { Button, ui } from "../components/UI";
export default function Saved() {
  return (
    <SellerAccess>
      <SavedItems />
    </SellerAccess>
  );
}
function SavedItems() {
  const [page, setPage] = useState(0);
  const { data, error, loading, reload } = useMemberData(
    `/mobile/saved?offset=${page * 25}`,
    parseListings,
  );
  const request = useMemberRequest();
  const [busy, setBusy] = useState(false);
  const [actionError, setError] = useState("");
  const lock = useRef(false);
  async function remove(id: number) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = (await request(`/mobile/community/listings/${id}/watch`, {
        method: "DELETE",
      })) as { watched?: unknown };
      if (result?.watched !== false)
        throw Error(
          "Removal was not confirmed. Refresh saved items before retrying.",
        );
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove item.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <ScrollView contentContainerStyle={ui.page}>
      <Text style={ui.title}>Saved items</Text>
      <Button
        label="Refresh saved items"
        disabled={busy || loading}
        onPress={reload}
      />
      <Text style={ui.copy}>
        Items you watch on Bazunk. Available listings are shared with your web
        account.
      </Text>
      {loading && <ActivityIndicator />}
      {!!error && (
        <>
          <Text style={ui.error}>{error}</Text>
          <Button label="Retry" onPress={reload} />
        </>
      )}
      {!!actionError && <Text style={ui.error}>{actionError}</Text>}
      {data?.length === 0 && (
        <Text style={ui.copy}>No available saved items on this page.</Text>
      )}
      {data?.map((item) => (
        <View style={ui.card} key={item.id}>
          {item.image && (
            <Image
              source={{ uri: item.image }}
              style={{ height: 140, borderRadius: 12 }}
              resizeMode="contain"
            />
          )}
          <Text style={ui.copy}>{item.title}</Text>
          <Text style={ui.link}>{price(item)}</Text>
          <Button
            label="View listing"
            onPress={() =>
              router.push({ pathname: "/listing", params: { id: item.id } })
            }
          />
          <Button
            label="Remove from saved"
            disabled={busy}
            onPress={() => void remove(item.id)}
          />
        </View>
      ))}
      {page > 0 && (
        <Button
          label="Previous page"
          disabled={loading || busy}
          onPress={() => setPage((p) => p - 1)}
        />
      )}{" "}
      {data?.length === 25 && (
        <Button
          label="Next page"
          disabled={loading || busy}
          onPress={() => setPage((p) => p + 1)}
        />
      )}
    </ScrollView>
  );
}
