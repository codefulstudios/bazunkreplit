import { useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { SellerAccess } from "../components/SellerAccess";
import { Button, ui } from "../components/UI";
import { Feedback, ListingPicker, useTask } from "../components/BusinessUI";
import { useMemberData, useMemberRequest } from "../hooks";
import { parsePromotions, ref, saved } from "../business";
export default function Promotions() {
  return (
    <SellerAccess>
      <Manage />
    </SellerAccess>
  );
}
function Manage() {
  const [listingId, setListing] = useState(0),
    data = useMemberData("/mobile/promotions", parsePromotions),
    request = useMemberRequest(),
    task = useTask(),
    pending = useRef<{ signature: string; id: string } | null>(null);
  return (
    <ScrollView contentContainerStyle={ui.page}>
      <Text style={ui.title}>Promote your listings</Text>
      <Button label="Credit wallet" onPress={() => router.push("/credits")} />
      <Button
        label="Refresh promotions"
        disabled={task.busy || data.loading}
        onPress={data.reload}
      />
      {data.loading ? (
        <ActivityIndicator />
      ) : data.error ? (
        <Text style={ui.error}>{data.error}</Text>
      ) : (
        data.data && (
          <>
            <Text style={ui.copy}>
              Balance: {data.data.balance} credits. Prices and duration are set
              by Bazunk admin. Promotions do not guarantee sales.
            </Text>
            <ListingPicker
              value={listingId}
              onChange={setListing}
              disabled={task.busy}
            />
            {data.data.catalog.map((c) => (
              <View key={String(c.type)} style={ui.card}>
                <Text style={ui.link}>{String(c.label)}</Text>
                <Text style={ui.copy}>
                  {Number(c.credits)} credits · {Number(c.days)} days
                </Text>
                <Button
                  label={c.enabled ? "Apply promotion" : "Unavailable"}
                  disabled={task.busy || !listingId || !c.enabled}
                  onPress={() =>
                    Alert.alert(
                      "Apply promotion?",
                      `Spend ${c.credits} credits on ${c.label}?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Apply",
                          onPress: () =>
                            void task.run(async () => {
                              const signature = JSON.stringify([
                                listingId,
                                c.type,
                                c.credits,
                              ]);
                              if (pending.current?.signature !== signature)
                                pending.current = { signature, id: ref() };
                              saved(
                                await request("/mobile/promotions", {
                                  method: "POST",
                                  body: {
                                    listingId,
                                    type: c.type,
                                    expectedCredits: c.credits,
                                    requestId: pending.current.id,
                                  },
                                }),
                              );
                              pending.current = null;
                              task.setNotice("Promotion activated.");
                              data.reload();
                            }),
                        },
                      ],
                    )
                  }
                />
              </View>
            ))}
            <Text style={ui.title}>Active promotions</Text>
            {data.data.active.map((p) => (
              <View key={String(p.id)} style={ui.card}>
                <Text style={ui.link}>
                  {String(p.title)} · {String(p.type)}
                </Text>
                <Text style={ui.copy}>
                  Expires {new Date(String(p.expiresAt)).toLocaleString()}
                </Text>
                <Button
                  label="Stop promotion"
                  disabled={task.busy}
                  onPress={() =>
                    Alert.alert(
                      "Stop early?",
                      "This stops the placement. It does not automatically refund credits.",
                      [
                        { text: "Keep", style: "cancel" },
                        {
                          text: "Stop",
                          onPress: () =>
                            void task.run(async () => {
                              saved(
                                await request("/mobile/promotions/" + p.id, {
                                  method: "DELETE",
                                }),
                              );
                              data.reload();
                            }),
                        },
                      ],
                    )
                  }
                />
              </View>
            ))}
          </>
        )
      )}
      <Feedback {...task} />
    </ScrollView>
  );
}
