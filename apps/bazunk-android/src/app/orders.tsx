import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";
import { SellerAccess } from "../components/SellerAccess";
import { Button, ui } from "../components/UI";
import { useMemberData } from "../hooks";
type Order = {
  id: string;
  title: string;
  image?: string;
  price: string | number;
  status: string;
  buyerTotal?: string | number | null;
  sellerNet?: string | number | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  address?: string | null;
};
function parse(x: unknown): Order[] {
  if (
    !Array.isArray(x) ||
    x.some(
      (o) =>
        typeof o.id !== "string" ||
        typeof o.title !== "string" ||
        typeof o.status !== "string" ||
        !Number.isFinite(Number(o.price)),
    )
  )
    throw Error("Unexpected orders response.");
  return x;
}
export default function Orders() {
  return (
    <SellerAccess>
      <OrderList />
    </SellerAccess>
  );
}
function OrderList() {
  const [role, setRole] = useState("buyer");
  const [page, setPage] = useState(0);
  const { data, error, loading, reload } = useMemberData(
    `/mobile/orders?role=${role}&offset=${page * 25}`,
    parse,
  );
  return (
    <ScrollView contentContainerStyle={ui.page}>
      <Text style={ui.title}>
        {role === "buyer" ? "My purchases" : "My sales"}
      </Text>
      <Button
        label={role === "buyer" ? "Show sales" : "Show purchases"}
        onPress={() => {
          setRole((r) => (r === "buyer" ? "seller" : "buyer"));
          setPage(0);
        }}
      />
      <Button label="Refresh orders" disabled={loading} onPress={reload} />
      {loading && <ActivityIndicator />}
      {!!error && <Text style={ui.error}>{error}</Text>}
      {data?.length === 0 && (
        <Text style={ui.copy}>No orders on this page.</Text>
      )}
      {data?.map((o) => (
        <View style={ui.card} key={o.id}>
          {o.image && (
            <Image
              source={{ uri: o.image }}
              style={{ height: 130 }}
              resizeMode="contain"
            />
          )}
          <Text style={ui.link}>{o.title}</Text>
          <Text style={ui.copy}>
            {o.id} · {o.status.replace(/_/g, " ")}
          </Text>
          <Text style={ui.copy}>
            {role === "buyer" ? "Order total" : "Item proceeds"}: £
            {Number(
              (role === "buyer" ? o.buyerTotal : o.sellerNet) ?? o.price,
            ).toFixed(2)}
          </Text>
          {!!o.trackingNumber && (
            <Text style={ui.copy}>
              Tracking: {o.carrier || ""} {o.trackingNumber}
            </Text>
          )}
          {!!o.address && (
            <Text style={ui.copy}>
              Delivery address:{"\n"}
              {o.address}
            </Text>
          )}
          <Button
            label="Open order details / manage delivery"
            onPress={() =>
              router.push({ pathname: "/order-details", params: { id: o.id } })
            }
          />
        </View>
      ))}
      {page > 0 && (
        <Button
          label="Previous page"
          disabled={loading}
          onPress={() => setPage((p) => p - 1)}
        />
      )}{" "}
      {data?.length === 25 && (
        <Button
          label="Next page"
          disabled={loading}
          onPress={() => setPage((p) => p + 1)}
        />
      )}
      <Text style={ui.copy}>
        Open an order to request a return or open a dispute.
      </Text>
    </ScrollView>
  );
}
