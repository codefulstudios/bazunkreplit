import {ActivityIndicator, ScrollView, Text, TextInput} from '../components/ThemedNative';
import { useEffect, useRef, useState } from "react";
import {Alert} from 'react-native';
import { router, useLocalSearchParams } from "expo-router";
import { SellerAccess } from "../components/SellerAccess";
import { Button, ui } from "../components/UI";
import { loadListing, price, type Listing } from "../api";
import { useMemberRequest } from "../hooks";
import {offerBody,offerReceipt} from "../member-contracts";
export default function CreateOffer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <SellerAccess>
      <Form key={id} />
    </SellerAccess>
  );
}
function Form() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const request = useMemberRequest();
  const [item, setItem] = useState<Listing | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [amount, setAmount] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    const c = new AbortController();
    void loadListing(id||"", c.signal)
      .then((x) => {
        if (!c.signal.aborted) setItem(x);
      })
      .catch((e) => {
        if (!c.signal.aborted)
          setError(e instanceof Error ? e.message : "Could not load listing.");
      });
    return () => c.abort();
  }, [id, retry]);
  async function send() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if(!item)throw Error('Listing not loaded.');
      offerReceipt(await request('/offers',{method:'POST',body:offerBody(item.id,amount,message)}));
      setSent(true);
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : "Could not send offer.") +
          " Check My offers before trying again.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!item)
    return (
      <ScrollView contentContainerStyle={ui.page}>
        {error ? (
          <>
            <Text style={ui.error}>{error}</Text>
            <Button
              label="Retry"
              onPress={() => {
                setError("");
                setRetry((n) => n + 1);
              }}
            />
          </>
        ) : (
          <ActivityIndicator />
        )}
      </ScrollView>
    );
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={ui.page}
    >
      <Text style={ui.title}>Make an offer</Text>
      <Text style={ui.copy}>
        {item.title} · {price(item)}
      </Text>
      <Text style={ui.copy}>
        Accepted offers are unpaid and do not reserve stock. App payment for agreed offers is not connected.
      </Text>
      {sent ? (
        <Text style={[ui.copy, { color: "#148453", fontWeight: "700" }]}>
          Offer saved. The seller can review it in My offers.
        </Text>
      ) : (item.currency || "GBP") !== "GBP" ? (
        <Text style={ui.error}>
          Offers currently support GBP listings only.
        </Text>
      ) : (
        <>
          <TextInput
            accessibilityLabel="Offer price in pounds"
            style={ui.input}
            placeholder="Your price (£)"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            editable={!busy}
          />
          <TextInput
            accessibilityLabel="Offer message"
            style={ui.input}
            placeholder="Optional message"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={200}
            editable={!busy}
          />
          <Button
            label={busy ? "Sending…" : "Send offer"}
            disabled={
              busy ||
              !/^\d{1,8}(\.\d{1,2})?$/.test(amount) ||
              Number(amount) <= 0 ||
              Number(amount) > Number(item.price)
            }
            onPress={() =>
              Alert.alert(
                "Send this offer?",
                `£${Number(amount).toFixed(2)} for ${item.title}. No payment is taken.`,
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Send", onPress: () => void send() },
                ],
              )
            }
          />
        </>
      )}
      {!!error && <Text style={ui.error}>{error}</Text>}
      <Button
        label="My offers"
        disabled={busy}
        onPress={() => router.push("/offers")}
      />
    </ScrollView>
  );
}
