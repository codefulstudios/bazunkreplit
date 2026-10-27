import {ActivityIndicator, ScrollView, Text, TextInput, View} from '../components/ThemedNative';
import { useRef, useState } from "react";
import {Alert} from 'react-native';
import { router } from "expo-router";
import { SellerAccess } from "../components/SellerAccess";
import { Button, ui } from "../components/UI";
import { useMemberData, useMemberRequest } from "../hooks";
import { parseOffers, parseOffer, type Offer } from "../offers";
export default function Offers() {
  return (
    <SellerAccess>
      <OffersList />
    </SellerAccess>
  );
}
function OffersList() {
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [offset, setOffset] = useState(0);
  const { data, error, loading, reload } = useMemberData(
    `/offers?role=${role}&offset=${offset}`,
    parseOffers,
  );
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={ui.page}
    >
      <Text style={ui.title}>Make a deal</Text>
      <Text style={ui.copy}>
        Negotiate directly with buyers and sellers. Acceptance is unpaid and
        does not reserve stock. Pay accepted prices through deal checkout; the
        normal cart uses the original listing price.
      </Text>
      <Button
        label={role === "buyer" ? "Buying offers ✓" : "Buying offers"}
        onPress={() => {
          setRole("buyer");
          setOffset(0);
        }}
      />
      <Button
        label={role === "seller" ? "Selling offers ✓" : "Selling offers"}
        onPress={() => {
          setRole("seller");
          setOffset(0);
        }}
      />
      <Button label="Refresh offers" onPress={reload} />
      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <>
          <Text style={ui.error}>{error}</Text>
          <Button label="Retry" onPress={reload} />
        </>
      ) : (
        <>
          {data?.length === 0 && (
            <Text style={ui.copy}>No offers on this page.</Text>
          )}
          {data?.map((o) => (
            <OfferCard
              key={`${o.id}:${o.version}:${role}`}
              offer={o}
              reload={reload}
            />
          ))}
          <View style={{ gap: 12 }}>
            {offset > 0 && (
              <Button
                label="Previous page"
                onPress={() => setOffset((n) => Math.max(0, n - 25))}
              />
            )}
            <Button
              label="Next page"
              disabled={data?.length !== 25}
              onPress={() => setOffset((n) => n + 25)}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}
function OfferCard({ offer: o, reload }: { offer: Offer; reload: () => void }) {
  const request = useMemberRequest();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [counter, setCounter] = useState(""),
    [message, setMessage] = useState("");
  async function act(action: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      parseOffer(
        await request(`/offers/${encodeURIComponent(o.id)}`, {
          method: "PATCH",
          body: {
            action,
            version: o.version,
            ...(action === "counter"
              ? { counterPrice: counter, counterMessage: message }
              : {}),
          },
        }),
      );
      reload();
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : "Could not respond.") +
          " Refresh to check the current state.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function confirm(action: string) {
    Alert.alert(
      action === "accept"
        ? "Accept this price?"
        : action === "counter"
          ? "Send counteroffer?"
          : action === "withdraw"
            ? "Withdraw this offer?"
            : "Decline this offer?",
      action === "accept"
        ? "Acceptance does not make a payment or reserve the item. Pay the accepted price through deal checkout."
        : "This response will be saved for both members.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => void act(action) },
      ],
    );
  }
  const pending = o.status === "pending",
    countered = o.status === "countered";
  return (
    <View
      style={[
        ui.card,
        {
          borderTopWidth: 5,
          borderTopColor: ["accepted", "counter_accepted"].includes(o.status)
            ? "#18a579"
            : countered
              ? "#7a49d8"
              : "#f26b21",
        },
      ]}
    >
      <Text style={[ui.title, { fontSize: 20 }]}>{o.productTitle}</Text>
      <Text style={ui.copy}>
        {o.role === "buyer"
          ? "Seller: " + o.sellerName
          : "Buyer: " + o.buyerName}
      </Text>
      <Text style={ui.copy}>{o.status.replace(/_/g, " ")} · GBP</Text>
      <Text style={ui.copy}>
        Listed £{o.listingPrice.toFixed(2)} · Offered £{o.offerPrice.toFixed(2)}
      </Text>
      {!!o.message && <Text style={ui.copy}>{o.message}</Text>}
      {o.counterPrice !== null && (
        <>
          <Text style={[ui.copy, { fontWeight: "700", color: "#7040b2" }]}>
            Counter £{o.counterPrice.toFixed(2)}
          </Text>
          {!!o.counterMessage && (
            <Text style={ui.copy}>{o.counterMessage}</Text>
          )}
        </>
      )}
      {(pending || countered) && (
        <Text style={ui.copy}>
          Respond before {new Date(o.expiresAt).toLocaleString()}. Server time
          determines expiry.
        </Text>
      )}
      {o.role === "seller" && pending && (
        <>
          <Button
            label="Accept offer"
            disabled={busy}
            onPress={() => confirm("accept")}
          />
          <Button
            label="Decline offer"
            disabled={busy}
            onPress={() => confirm("decline")}
          />
          <TextInput
            accessibilityLabel="Counter price in pounds"
            placeholder="Counter price (£)"
            keyboardType="decimal-pad"
            value={counter}
            onChangeText={setCounter}
            editable={!busy}
            style={ui.input}
          />
          <TextInput
            accessibilityLabel="Counter message"
            placeholder="Optional message"
            value={message}
            onChangeText={setMessage}
            maxLength={1000}
            editable={!busy}
            style={ui.input}
          />
          <Button
            label="Send counteroffer"
            disabled={
              busy || !/^\d+(\.\d{1,2})?$/.test(counter) || Number(counter) <= 0
            }
            onPress={() => confirm("counter")}
          />
        </>
      )}
      {o.role === "buyer" && countered && (
        <>
          <Button
            label="Accept counteroffer"
            disabled={busy}
            onPress={() => confirm("accept")}
          />
          <Button
            label="Decline counteroffer"
            disabled={busy}
            onPress={() => confirm("decline")}
          />
        </>
      )}
      {o.role === "buyer" &&
        ["pending", "countered", "accepted", "counter_accepted"].includes(
          o.status,
        ) && (
          <Button
            label="Withdraw offer"
            disabled={busy || o.paymentState !== "none"}
            onPress={() => confirm("withdraw")}
          />
        )}
      {o.role === "buyer" &&
        ["accepted", "counter_accepted"].includes(o.status) && (
          <Button
            label={
              o.paymentState === "paid"
                ? "View paid deal"
                : o.paymentState === "pending"
                  ? "Check / resume deal payment"
                  : "Pay agreed price"
            }
            disabled={busy}
            onPress={() =>
              router.push({ pathname: "/deal-payment", params: { id: o.id } })
            }
          />
        )}
      {o.paymentState === "paid" && (
        <Text style={ui.copy}>Paid · see Purchases and sales.</Text>
      )}
      <Button
        label="View listing"
        disabled={busy}
        onPress={() =>
          router.push({
            pathname: "/listing",
            params: { id: String(o.productId) },
          })
        }
      />
      {!!error && (
        <Text accessibilityLiveRegion="polite" style={ui.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
