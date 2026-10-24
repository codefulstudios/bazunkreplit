import { useAuth } from "@clerk/expo";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { bidAmount, minimumBid, parseAuction, type Auction } from "../auctions";
import { usePublicData } from "../publicData";
import { useMemberRequest } from "../hooks";
import { Button, ui } from "../components/UI";
export default function AuctionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Details key={id} id={id} />;
}
function Details({ id }: { id: string }) {
  const {
    data: a,
    error,
    loading,
    reload,
  } = usePublicData(
    `/mobile/auctions/${encodeURIComponent(id || "")}`,
    parseAuction,
  );
  const [now, setNow] = useState(() => Date.now());
  const [serverOffset, setServerOffset] = useState(0);
  useEffect(() => {
    if (a)
      void Promise.resolve().then(() =>
        setServerOffset(Date.parse(a.serverNow) - Date.now()),
      );
  }, [a]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = a
    ? Math.max(
        0,
        Math.ceil((Date.parse(a.endTime) - now - serverOffset) / 1000),
      )
    : 0;
  const time =
    remaining >= 86400
      ? `${Math.floor(remaining / 86400)}d ${Math.floor((remaining % 86400) / 3600)}h`
      : `${Math.floor(remaining / 3600)}h ${Math.floor((remaining % 3600) / 60)}m ${remaining % 60}s`;
  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (error || !a)
    return (
      <View style={ui.page}>
        <Text style={ui.error}>{error || "Auction unavailable."}</Text>
        <Button label="Retry" onPress={reload} />
      </View>
    );
  return (
    <ScrollView contentContainerStyle={ui.page}>
      {a.status === "ended" &&
        a.bidCount > 0 &&
        (!a.hasReserve || a.reserveMet === true) && (
          <Button
            label="Winner checkout / payment status"
            onPress={() =>
              router.push({
                pathname: "/special-payment",
                params: { kind: "auction", id: id || "" },
              })
            }
          />
        )}
      {a.images.map((image, i) => (
        <Image
          key={i}
          source={{ uri: image }}
          style={{ height: 250, borderRadius: 16 }}
          resizeMode="contain"
        />
      ))}
      <Text style={ui.title}>{a.title}</Text>
      <Text style={ui.copy}>Seller: {a.sellerName}</Text>
      <Text style={ui.title}>
        £{(a.currentBid ?? a.startingBid).toFixed(2)}
      </Text>
      <Text style={ui.copy}>
        {a.bidCount} bids ·{" "}
        {a.status === "active" && remaining > 0
          ? `${time} remaining`
          : "Closed"}
      </Text>
      <Text style={ui.copy}>{a.description}</Text>
      {a.hasReserve && (
        <Text style={ui.copy}>
          Hidden reserve: {a.reserveMet ? "met" : "not met"}
        </Text>
      )}
      {a.extendEnabled && (
        <Text style={ui.copy}>
          Late bids can extend this auction by two minutes.
        </Text>
      )}
      <Button label="Refresh auction" onPress={reload} />
      {process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
        <AuthenticatedBid
          auction={a}
          closed={!remaining || a.status !== "active"}
          reload={reload}
        />
      ) : (
        <Button
          label="Sign in to bid"
          onPress={() => router.push("/account")}
        />
      )}
      <Text style={ui.copy}>
        Only the confirmed winner can pay after the auction ends and its reserve
        is met. Refresh after the countdown finishes to check the final result.
      </Text>
      <Text style={ui.title}>Recent bids</Text>
      {a.bids?.length === 0 && <Text style={ui.copy}>No bids yet.</Text>}
      {a.bids?.map((b) => (
        <View style={ui.card} key={b.id}>
          <Text style={ui.copy}>
            {b.name} · £{Number(b.amount).toFixed(2)}
          </Text>
          <Text style={ui.copy}>{new Date(b.createdAt).toLocaleString()}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
function AuthenticatedBid({
  auction: a,
  closed,
  reload,
}: {
  auction: Auction;
  closed: boolean;
  reload: () => void;
}) {
  const { isSignedIn, userId } = useAuth();
  return isSignedIn ? (
    <BidForm
      key={`${userId}:${a.id}`}
      auction={a}
      closed={closed}
      reload={reload}
    />
  ) : (
    <Button label="Sign in to bid" onPress={() => router.push("/account")} />
  );
}
function BidForm({
  auction: a,
  closed,
  reload,
}: {
  auction: Auction;
  closed: boolean;
  reload: () => void;
}) {
  const request = useMemberRequest();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function submit(value: number) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = (await request(
        `/mobile/auctions/${encodeURIComponent(a.id)}/bid`,
        { method: "POST", body: { amount: value.toFixed(2) } },
      )) as { currentBid?: unknown };
      if (
        typeof result.currentBid !== "number" ||
        !Number.isFinite(result.currentBid)
      )
        throw Error("Unexpected bid response.");
      setAmount("");
      Alert.alert(
        "Bid accepted",
        `Your bid of £${result.currentBid.toFixed(2)} was accepted.`,
      );
      reload();
    } catch (e) {
      setError(
        `${e instanceof Error ? e.message : "Could not place bid."} Refresh before bidding again if the connection was interrupted.`,
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function confirm() {
    try {
      const value = bidAmount(amount);
      if (value < minimumBid(a))
        throw Error(`The current minimum bid is £${minimumBid(a).toFixed(2)}.`);
      Alert.alert(
        "Confirm your bid",
        `Place a bid of £${value.toFixed(2)}? Only bid if you intend to buy the item.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Place bid", onPress: () => void submit(value) },
        ],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid bid.");
    }
  }
  return (
    <View style={ui.card}>
      <Text style={ui.copy}>Next minimum bid: £{minimumBid(a).toFixed(2)}</Text>
      <TextInput
        accessibilityLabel="Your bid in GBP"
        style={ui.input}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        editable={!busy && !closed}
        placeholder="Your bid in GBP"
      />
      <Button
        label={busy ? "Placing bid…" : "Review bid"}
        disabled={busy || closed || !amount.trim()}
        onPress={confirm}
      />
      {closed && <Text style={ui.copy}>This auction is closed.</Text>}
      {!!error && (
        <Text accessibilityLiveRegion="polite" style={ui.error}>
          {error}
        </Text>
      )}
      {!!success && <Text style={ui.copy}>{success}</Text>}
      <Button label="My bids" onPress={() => router.push("/my-auctions")} />
    </View>
  );
}
