import {ActivityIndicator, ScrollView, Text, View} from '../components/ThemedNative';
import { useRef, useState } from "react";
import {Alert} from 'react-native';
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { SellerAccess } from "../components/SellerAccess";
import { Button, ui } from "../components/UI";
import { useMemberData, useMemberRequest } from "../hooks";
import { parseDealPayment } from "../dealPayment";
export default function SpecialPaymentScreen() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind: string }>();
  return (
    <SellerAccess>
      <Payment
        key={`${kind}:${id}`}
        id={id || ""}
        kind={kind === "auction" ? "auction" : "flash"}
      />
    </SellerAccess>
  );
}
function Payment({ id, kind }: { id: string; kind: string }) {
  const path = `/special-payments/${kind}/${encodeURIComponent(id)}`;
  const { data, error, loading, reload } = useMemberData(
    path,
    parseDealPayment,
  );
  const request = useMemberRequest();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState("");
  async function act(kind: "pay" | "resume" | "cancel") {
    if (lock.current || !data) return;
    lock.current = true;
    setBusy(true);
    setActionError("");
    try {
      const updated =
        kind === "resume"
          ? parseDealPayment(await request(path))
          : parseDealPayment(
              await request(path + (kind === "cancel" ? "/cancel" : ""), {
                method: "POST",
                body: kind === "pay" ? { expectedTotal: data.quote.total } : {},
              }),
            );
      if (kind !== "cancel" && updated.paymentState === "unpaid" && updated.url)
        await WebBrowser.openBrowserAsync(updated.url);
      reload();
    } catch (e) {
      setActionError(
        (e instanceof Error
          ? e.message
          : "Could not complete payment request.") +
          " Refresh payment status before retrying.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <ScrollView contentContainerStyle={ui.page}>
      <Text style={ui.title}>
        {kind === "auction" ? "Pay auction win" : "Flash-sale checkout"}
      </Text>
      <Text style={ui.copy}>
        Your checkout is saved on the server. Resume it here after closing the
        app or using another device. Payment opens Stripe in your phone browser.
      </Text>
      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <>
          <Text style={ui.error}>{error}</Text>
          <Button
            label="Retry payment status"
            disabled={busy}
            onPress={reload}
          />
        </>
      ) : (
        data && (
          <>
            <View style={ui.card}>
              {data.quote.items.map((item) => (
                <Text style={ui.copy} key={item.id}>
                  {item.title} · Item price £{item.price.toFixed(2)}
                </Text>
              ))}
              <Text style={ui.copy}>
                Buyer Protection £{data.quote.buyerProtectionFee.toFixed(2)}
              </Text>
              <Text style={ui.copy}>
                Delivery £{data.quote.delivery.toFixed(2)}
              </Text>
              <Text style={ui.title}>Total £{data.quote.total.toFixed(2)}</Text>
              <Text style={ui.copy}>
                Private-seller protection is added to the buyer total. Business
                selling fees are deducted from seller proceeds. Credits cannot
                pay for items or fees.
              </Text>
            </View>
            <Text accessibilityLiveRegion="polite" style={ui.copy}>
              {data.paymentState === "paid"
                ? "Payment confirmed. View your order in Purchases and sales."
                : data.paymentState === "processing"
                  ? "Payment is being checked or orders are being prepared. Keep checking before starting another payment."
                  : data.paymentState === "unpaid"
                    ? "An unpaid checkout is open. Resume or cancel it."
                    : "Ready to pay."}
            </Text>
            {["none", "expired"].includes(data.paymentState) && (
              <>
                {!data.enabled && (
                  <Text style={ui.copy}>Checkout is awaiting setup.</Text>
                )}
                <Button
                  label={busy ? "Opening checkout…" : "Pay for item"}
                  disabled={busy || !data.enabled}
                  onPress={() =>
                    Alert.alert(
                      "Confirm this payment?",
                      `Total £${data.quote.total.toFixed(2)}, including displayed fees.`,
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Continue", onPress: () => void act("pay") },
                      ],
                    )
                  }
                />
              </>
            )}
            {data.paymentState === "unpaid" && (
              <>
                <Button
                  label="Resume Stripe checkout"
                  disabled={busy}
                  onPress={() => void act("resume")}
                />
                <Button
                  label="Cancel unpaid checkout"
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(
                      "Cancel checkout?",
                      "Cancellation must be confirmed by Stripe before the item can be released.",
                      [
                        { text: "Keep", style: "cancel" },
                        {
                          text: "Cancel checkout",
                          onPress: () => void act("cancel"),
                        },
                      ],
                    )
                  }
                />
              </>
            )}
            <Button
              label="Refresh payment status"
              disabled={busy}
              onPress={reload}
            />
          </>
        )
      )}
      {!!actionError && (
        <Text accessibilityLiveRegion="polite" style={ui.error}>
          {actionError}
        </Text>
      )}
      <Text style={ui.copy}>
        Use this checkout for the auction winning bid or flash-sale price. An
        order is created only after the server confirms payment.
      </Text>
      <Button
        label="Purchases and sales"
        disabled={busy}
        onPress={() => router.push("/orders")}
      />
      <Button
        label="My offers"
        disabled={busy}
        onPress={() => router.push("/offers")}
      />
    </ScrollView>
  );
}
