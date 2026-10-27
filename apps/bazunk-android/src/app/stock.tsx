import {ActivityIndicator, ScrollView, Text, TextInput} from '../components/ThemedNative';
import { useRef, useState } from "react";
import {Alert} from 'react-native';
import { useLocalSearchParams } from "expo-router";
import { SellerAccess } from "../components/SellerAccess";
import { Button, ui } from "../components/UI";
import { useMemberData, useMemberRequest } from "../hooks";
import { parseInventory, parseStockChange } from "../inventory";
export default function Stock() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <SellerAccess>
      <Editor key={id} id={id || ""} />
    </SellerAccess>
  );
}
function Editor({ id }: { id: string }) {
  const { data, error, loading, reload } = useMemberData(
    `/inventory/listings/${encodeURIComponent(id)}/mine`,
    parseInventory,
  );
  const request = useMemberRequest();
  const [quantity, setQuantity] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const lock = useRef(false);
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice("");
    try {
      parseStockChange(
        await request(`/inventory/listings/${id}`, {
          method: "PATCH",
          body: { quantity },
        }),
      );
      setNotice("Remaining stock saved.");
      setQuantity("");
      reload();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not update stock.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={ui.page}
    >
      <Text style={ui.title}>Manage remaining stock</Text>
      <Text style={ui.copy}>
        This is your unsold quantity, including units held in unpaid checkouts.
        Confirmed sales reduce it automatically. Stock cannot be reduced below
        the amount held by checkouts.
      </Text>
      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <>
          <Text style={ui.error}>{error}</Text>
          <Button label="Retry" onPress={reload} />
        </>
      ) : (
        data && (
          <>
            <Text style={ui.copy}>
              Remaining {data.quantity} · Held {data.held} · Available{" "}
              {data.available}
            </Text>
            <Text style={ui.copy}>
              Listing: {data.status}. Restocking a sold listing above zero
              reactivates it; archived or draft listings keep their status.
            </Text>
            <TextInput
              accessibilityLabel="New remaining stock"
              keyboardType="number-pad"
              style={ui.input}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="New remaining quantity (0–10,000)"
              editable={!busy}
            />
            <Button
              label={busy ? "Saving…" : "Save remaining stock"}
              disabled={
                busy || !/^\d+$/.test(quantity) || Number(quantity) > 10000
              }
              onPress={() =>
                Alert.alert(
                  "Set remaining stock?",
                  `Set this listing to ${Number(quantity)} remaining units. This replaces the current unsold count.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Save", onPress: () => void save() },
                  ],
                )
              }
            />
          </>
        )
      )}
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={ui.copy}>
          {notice}
        </Text>
      )}
    </ScrollView>
  );
}
