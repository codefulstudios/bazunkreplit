import { useState } from "react";
import { useAuth } from "@clerk/expo";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import Purchases, { type PurchasesPackage } from "react-native-purchases";
import { SellerAccess } from "../components/SellerAccess";
import { Button, ui } from "../components/UI";
import { Feedback, useTask } from "../components/BusinessUI";
import { useMemberData } from "../hooks";
import { parseWallet } from "../business";
export default function Credits() {
  return (
    <SellerAccess>
      <Wallet />
    </SellerAccess>
  );
}
function Wallet() {
  const { userId } = useAuth(),
    wallet = useMemberData("/mobile/credits", parseWallet),
    task = useTask(),
    [packs, setPacks] = useState<PurchasesPackage[]>([]);
  const key = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  async function identify() {
    if (!key || !userId)
      throw Error("Google Play purchases are not configured in this build.");
    if (!(await Purchases.isConfigured()))
      Purchases.configure({ apiKey: key, appUserID: userId });
    else if ((await Purchases.getAppUserID()) !== userId)
      await Purchases.logIn(userId);
  }
  async function packages() {
    await identify();
    const offering = (await Purchases.getOfferings()).current;
    const available =
      offering?.availablePackages.filter(
        (p) => wallet.data?.products[p.product.identifier],
      ) ?? [];
    setPacks(available);
    if (!available.length) throw Error("No credit packs are available yet.");
  }
  return (
    <ScrollView contentContainerStyle={ui.page}>
      <Text style={ui.title}>Bazunk credits</Text>
      {wallet.loading ? (
        <ActivityIndicator />
      ) : wallet.error ? (
        <Text style={ui.error}>{wallet.error}</Text>
      ) : (
        wallet.data && (
          <>
            <Text style={ui.title}>{wallet.data.balance} credits</Text>
            <Text style={ui.copy}>
              Use credits for supported promotions. Credits cannot pay for
              items, business selling fees, Buyer Protection or delivery.
            </Text>
            {wallet.data.purchasesEnabled && key ? (
              <Button
                label="Load Google Play credit packs"
                disabled={task.busy}
                onPress={() => void task.run(packages)}
              />
            ) : (
              <Text style={ui.copy}>
                Credit purchases are not available in this build yet.
              </Text>
            )}
            {packs.map((p) => (
              <View key={p.identifier} style={ui.card}>
                <Text style={ui.link}>
                  {wallet.data!.products[p.product.identifier]} credits ·{" "}
                  {p.product.priceString}
                </Text>
                <Button
                  label="Buy with Google Play"
                  disabled={task.busy || !wallet.data?.purchasesEnabled}
                  onPress={() =>
                    void task.run(async () => {
                      await identify();
                      await Purchases.purchasePackage(p);
                      task.setNotice(
                        "Purchase submitted. Credits appear after server confirmation. Refresh your balance; do not buy again to retry this purchase.",
                      );
                      wallet.reload();
                    })
                  }
                />
              </View>
            ))}
            <Text style={ui.link}>Recent credit activity</Text>
            {wallet.data.history.map((h) => (
              <View key={String(h.id)} style={ui.card}>
                <Text style={ui.copy}>
                  {String(h.reason ?? h.kind)} · {Number(h.credits)} credits
                </Text>
              </View>
            ))}
          </>
        )
      )}
      <Button
        label="Refresh balance"
        disabled={task.busy || wallet.loading}
        onPress={wallet.reload}
      />
      <Feedback {...task} />
    </ScrollView>
  );
}
