import { router } from "expo-router";
import { ScrollView, Text } from "react-native";
import { Button, ui } from "../components/UI";
export default function More() {
  return (
    <ScrollView contentContainerStyle={ui.page}>
      <Text style={ui.title}>Your Bazunk</Text>
      <Button label="Credit wallet" onPress={() => router.push("/credits")} />
      <Button
        label="Promote listings"
        onPress={() => router.push("/promotions")}
      />
      <Button
        label="Seller verification"
        onPress={() => router.push("/verification")}
      />
      <Button
        label="Import inventory"
        onPress={() => router.push("/importers")}
      />
      <Button label="Live selling" onPress={() => router.push("/live")} />
      <Button label="Terms and privacy" onPress={() => router.push("/legal")} />
      <Button label="Offers and deals" onPress={() => router.push("/offers")} />
      <Button label="Classifieds" onPress={() => router.push("/classifieds")} />
      <Button label="Flash sales" onPress={() => router.push("/flash-sales")} />
      <Button
        label="My ads and flash sales"
        onPress={() => router.push("/my-specials")}
      />
      <Button
        label="Rewards and milestones"
        onPress={() => router.push("/rewards")}
      />
      <Button label="Games arcade" onPress={() => router.push("/arcade")} />
      <Button label="Auctions" onPress={() => router.push("/auctions")} />
      <Button label="Account" onPress={() => router.push("/account")} />
      <Button label="Sell an item" onPress={() => router.push("/sell")} />
      <Button label="My listings" onPress={() => router.push("/my-listings")} />
      <Button label="Saved items" onPress={() => router.push("/saved")} />
      <Button label="Messages" onPress={() => router.push("/messages")} />
      <Button label="Cart" onPress={() => router.push("/cart")} />
      <Button
        label="Returns and disputes"
        onPress={() => router.push("/cases")}
      />
      <Button
        label="Purchases and sales"
        onPress={() => router.push("/orders")}
      />
    </ScrollView>
  );
}
