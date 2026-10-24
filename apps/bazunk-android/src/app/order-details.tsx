import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SellerAccess } from "../components/SellerAccess";
import { Button, ui } from "../components/UI";
import { useMemberData, useMemberRequest } from "../hooks";
import {
  parseManagedOrder,
  parseOrderAction,
  type ManagedOrder,
} from "../orderManagement";
export default function OrderDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <SellerAccess>
      <Details key={id} id={id || ""} />
    </SellerAccess>
  );
}
function Details({ id }: { id: string }) {
  const { data, error, loading, reload } = useMemberData(
    `/mobile/order-management/${encodeURIComponent(id)}`,
    parseManagedOrder,
  );
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={ui.page}
    >
      <Text style={ui.title}>Order details</Text>
      <Button label="Refresh order" disabled={loading} onPress={reload} />
      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text style={ui.error}>{error}</Text>
      ) : (
        data && (
          <>
            <View style={ui.card}>
              <Text style={ui.link}>{data.title}</Text>
              <Text style={ui.copy}>
                {data.id} · {data.status.replace(/_/g, " ")}
              </Text>
              <Text style={ui.copy}>
                {data.role === "buyer" ? "Order total" : "Item proceeds"}: £
                {data.amount.toFixed(2)}
              </Text>
              <Text style={ui.copy}>Item price: £{data.price.toFixed(2)}</Text>
              {data.buyerProtectionFee !== null && (
                <Text style={ui.copy}>
                  Buyer Protection: £{data.buyerProtectionFee.toFixed(2)} ·
                  Delivery: £{(data.delivery ?? 0).toFixed(2)}
                </Text>
              )}
              {data.sellerFee !== null && (
                <Text style={ui.copy}>
                  Selling fee: £{data.sellerFee.toFixed(2)}
                </Text>
              )}
            </View>
            <View style={ui.card}>
              <Text style={ui.link}>Delivery details</Text>
              <Text style={ui.copy}>
                {data.address || "No delivery address recorded."}
              </Text>
              <Text style={ui.copy}>
                Carrier: {data.carrier || "not provided"}
                {"\n"}Tracking: {data.trackingNumber || "not provided"}
              </Text>
              {!!data.estimatedDelivery && (
                <Text style={ui.copy}>
                  Estimated delivery: {data.estimatedDelivery}
                </Text>
              )}
              <Text style={ui.copy}>
                Created: {new Date(data.createdAt).toLocaleString()}
              </Text>
              {data.shippedAt && (
                <Text style={ui.copy}>
                  Marked dispatched: {new Date(data.shippedAt).toLocaleString()}
                </Text>
              )}
              {data.deliveredAt && (
                <Text style={ui.copy}>
                  Marked delivered:{" "}
                  {new Date(data.deliveredAt).toLocaleString()}
                </Text>
              )}
              <Text style={ui.copy}>
                Tracking and status are recorded by sellers, buyers or admin.
                Automatic carrier updates and label generation are not connected
                here.
              </Text>
            </View>
            <Button
              label="Returns and disputes"
              onPress={() => router.push("/cases")}
            />
            {data.role === "buyer" && (
              <Button
                label="Request return / open dispute"
                onPress={() =>
                  router.push({
                    pathname: "/case-create",
                    params: { orderId: data.id },
                  })
                }
              />
            )}
            <Actions
              key={`${data.status}:${data.carrier}:${data.trackingNumber}`}
              data={data}
              reload={reload}
            />
            {data.hasOpenCase && (
              <Text style={ui.copy}>
                This order has an open return or dispute. Open Returns and
                disputes to manage the case before confirming delivery.
              </Text>
            )}
            <Button
              label="Review this order / view reviews"
              onPress={() =>
                router.push({
                  pathname: "/order-review",
                  params: { id: data.id },
                })
              }
            />
            <Text style={ui.copy}>
              Refund and payout decisions remain handled by Bazunk
              support/admin.
            </Text>
          </>
        )
      )}
    </ScrollView>
  );
}
function Actions({ data, reload }: { data: ManagedOrder; reload: () => void }) {
  const request = useMemberRequest(),
    lock = useRef(false);
  const [carrier, setCarrier] = useState(data.carrier ?? ""),
    [tracking, setTracking] = useState(data.trackingNumber ?? ""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function submit(action: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNotice("");
    try {
      parseOrderAction(
        await request(
          `/mobile/order-management/${encodeURIComponent(data.id)}/${action}`,
          { method: "POST", body: { carrier, trackingNumber: tracking } },
        ),
      );
      reload();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not save the change.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (
    !data.canPrepare &&
    !data.canDispatch &&
    !data.canUpdateTracking &&
    !data.canConfirmDelivery
  )
    return null;
  return (
    <View style={ui.card}>
      {data.canPrepare && (
        <Button
          label="Mark as preparing"
          disabled={busy}
          onPress={() => void submit("prepare")}
        />
      )}{" "}
      {(data.canDispatch || data.canUpdateTracking) && (
        <>
          <Text style={ui.link}>Shipment details</Text>
          <TextInput
            accessibilityLabel="Carrier"
            style={ui.input}
            placeholder="Carrier (optional for dispatch)"
            maxLength={80}
            value={carrier}
            onChangeText={setCarrier}
            editable={!busy}
          />
          <TextInput
            accessibilityLabel="Tracking number"
            style={ui.input}
            placeholder="Tracking number (optional for dispatch)"
            maxLength={200}
            value={tracking}
            onChangeText={setTracking}
            editable={!busy}
          />
          {data.canDispatch ? (
            <Button
              label={busy ? "Saving…" : "Mark dispatched"}
              disabled={busy}
              onPress={() =>
                Alert.alert(
                  "Mark dispatched?",
                  "Confirm that you have handed over or sent this item. This notifies the buyer.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Confirm dispatch",
                      onPress: () => void submit("dispatch"),
                    },
                  ],
                )
              }
            />
          ) : (
            <Button
              label={busy ? "Saving…" : "Update tracking"}
              disabled={busy || !carrier.trim() || !tracking.trim()}
              onPress={() => void submit("tracking")}
            />
          )}
        </>
      )}{" "}
      {data.canConfirmDelivery && (
        <Button
          label={busy ? "Saving…" : "Confirm item received"}
          disabled={busy}
          onPress={() =>
            Alert.alert(
              "Confirm delivery?",
              "Confirm only when the item has arrived. This records delivery and informs the seller.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Item received",
                  onPress: () => void submit("delivered"),
                },
              ],
            )
          }
        />
      )}{" "}
      {!!notice && (
        <Text style={ui.error}>
          {notice}
          {"\n"}Refresh the order after an interrupted request before retrying.
        </Text>
      )}
    </View>
  );
}
