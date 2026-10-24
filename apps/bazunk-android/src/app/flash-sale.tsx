import { useAuth } from "@clerk/expo";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { usePublicData } from "../publicData";
import { useMemberData, useMemberRequest } from "../hooks";
import { parseSale, parseAccess, parseInterests, type Sale } from "../specials";
import { ContactButton } from "../components/ContactButton";
import { SaleCountdown } from "../components/SpecialUI";
import { Button, ui } from "../components/UI";
export default function FlashDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    data: s,
    error,
    loading,
    reload,
  } = usePublicData(
    `/mobile/flash-sales/${encodeURIComponent(id || "")}`,
    parseSale,
  );
  return (
    <ScrollView contentContainerStyle={ui.page}>
      {loading && <ActivityIndicator />}
      {!!error && <Text style={ui.error}>{error}</Text>}
      <Button label="Refresh sale" disabled={loading} onPress={reload} />
      {s && (
        <>
          <Text style={ui.title}>⚡ {s.title}</Text>
          {s.image && (
            <Image
              source={{ uri: s.image }}
              style={{ height: 250, borderRadius: 16 }}
              resizeMode="contain"
            />
          )}
          <SaleCountdown sale={s} />
          <View style={[ui.card, { backgroundColor: "#ffe5cc" }]}>
            <Text style={ui.title}>£{s.salePrice.toFixed(2)}</Text>
            <Text style={[ui.copy, { textDecorationLine: "line-through" }]}>
              £{s.originalPrice.toFixed(2)}
            </Text>
            <Text style={ui.copy}>
              {s.discountPercent}% off · {s.saleType.replace(/_/g, " ")}
            </Text>
            <Text style={ui.copy}>Seller: {s.sellerName}</Text>
          </View>
          <Text style={ui.copy}>{s.description}</Text>
          {process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
            <MemberGate sale={s} reload={reload} />
          ) : (
            <Button
              label="Sign in to buy or register interest"
              onPress={() => router.push("/account")}
            />
          )}
          <Text style={ui.copy}>
            Registering interest shares your verified email with the seller. It
            does not reserve stock, take payment or create an order. Use the
            checkout button to buy while this sale is available.
          </Text>
        </>
      )}
    </ScrollView>
  );
}
function MemberGate({ sale, reload }: { sale: Sale; reload: () => void }) {
  const { isSignedIn, userId } = useAuth();
  return isSignedIn ? (
    <MemberActions key={`${userId}:${sale.id}`} sale={sale} reload={reload} />
  ) : (
    <Button
      label="Sign in to buy or register interest"
      onPress={() => router.push("/account")}
    />
  );
}
function MemberActions({
  sale: s,
  reload,
}: {
  sale: Sale;
  reload: () => void;
}) {
  const {
    data,
    error,
    reload: retry,
  } = useMemberData(
    `/mobile/flash-sales/${encodeURIComponent(s.id)}/access`,
    parseAccess,
  );
  if (error)
    return (
      <View style={ui.card}>
        <Text style={ui.error}>{error}</Text>
        <Button label="Retry access" onPress={retry} />
      </View>
    );
  if (!data) return <ActivityIndicator />;
  return data.isOwner ? (
    <Owner sale={s} reload={reload} />
  ) : (
    <>
      {s.status === "active" && (
        <Button
          label="Buy flash-sale item"
          onPress={() =>
            router.push({
              pathname: "/special-payment",
              params: { kind: "flash", id: s.id },
            })
          }
        />
      )}
      <Button
        label="Check my payment status"
        onPress={() =>
          router.push({
            pathname: "/special-payment",
            params: { kind: "flash", id: s.id },
          })
        }
      />
      <Interest sale={s} />
    </>
  );
}
function Interest({ sale: s }: { sale: Sale }) {
  const request = useMemberRequest();
  const [message, setMessage] = useState("I am interested in this flash sale."),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const lock = useRef(false);
  async function send() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const r = (await request(
        `/mobile/flash-sales/${encodeURIComponent(s.id)}/interest`,
        { method: "POST", body: { message, shareEmail: true } },
      )) as { ok?: boolean; message?: string };
      if (r.ok !== true || typeof r.message !== "string")
        throw Error("Could not confirm interest.");
      setNotice(r.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not register interest.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={ui.card}>
      <TextInput
        accessibilityLabel="Message to flash-sale seller"
        style={ui.input}
        multiline
        value={message}
        onChangeText={setMessage}
        maxLength={1000}
        editable={!busy && !notice}
        placeholder="Message to the seller"
      />
      <Button
        label={
          busy
            ? "Registering…"
            : notice
              ? "Interest registered"
              : "Register interest"
        }
        disabled={busy || !!notice || s.status !== "active" || !message.trim()}
        onPress={() =>
          Alert.alert(
            "Share your contact email?",
            `Your verified Bazunk email and this message will be shared with the seller of “${s.title}”. This does not place an order.`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Share and register", onPress: () => void send() },
            ],
          )
        }
      />
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={ui.copy}>
          {notice}
        </Text>
      )}
      {!!error && (
        <Text accessibilityLiveRegion="polite" style={ui.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
function Owner({ sale: s, reload }: { sale: Sale; reload: () => void }) {
  const request = useMemberRequest();
  const {
    data,
    error,
    reload: retry,
  } = useMemberData(
    `/mobile/flash-sales/${encodeURIComponent(s.id)}/interests`,
    parseInterests,
  );
  const [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState("");
  const lock = useRef(false);
  async function cancel() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setActionError("");
    try {
      const result = (await request(
        `/mobile/flash-sales/${encodeURIComponent(s.id)}/cancel`,
        { method: "PATCH", body: {} },
      )) as { ok?: boolean };
      if (result.ok !== true) throw Error("Could not confirm cancellation.");
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not cancel sale.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 14 }}>
      {["active", "upcoming"].includes(s.status) && (
        <Button
          label={busy ? "Cancelling…" : "Cancel your flash sale"}
          disabled={busy}
          onPress={() =>
            Alert.alert(
              "Cancel this sale?",
              "The sale will remain in your history.",
              [
                { text: "Keep sale", style: "cancel" },
                {
                  text: "Cancel sale",
                  style: "destructive",
                  onPress: () => void cancel(),
                },
              ],
            )
          }
        />
      )}{" "}
      {!!actionError && <Text style={ui.error}>{actionError}</Text>}
      <Text style={ui.title}>Interested buyers</Text>
      <Button label="Refresh interested buyers" onPress={retry} />
      {!!error && <Text style={ui.error}>{error}</Text>}
      {data?.length === 0 && (
        <Text style={ui.copy}>No registered interest yet.</Text>
      )}
      {data?.map((i) => (
        <View style={ui.card} key={i.id}>
          <Text style={ui.link}>{i.name}</Text>
          <Text style={ui.copy}>{i.message}</Text>
          <Text style={ui.copy}>{new Date(i.createdAt).toLocaleString()}</Text>
          <ContactButton kind="email" value={i.email} title={s.title} />
        </View>
      ))}
      <Text style={ui.copy}>
        Shows the most recent 100 requests. Buyers agreed to share their email
        for this sale. Contact them to discuss availability.
      </Text>
    </View>
  );
}
