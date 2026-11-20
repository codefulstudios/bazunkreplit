import {ActivityIndicator, ScrollView, Text, View} from '../components/ThemedNative';
import { useState } from "react";

import { router } from "expo-router";
import { SellerAccess } from "../components/SellerAccess";
import { Button, ui } from "../components/UI";
import { useMemberData } from "../hooks";
import { casePath, caseLabel, parseCases, type CaseKind } from "../cases";
export default function Cases() {
  return (
    <SellerAccess>
      <List />
    </SellerAccess>
  );
}
function List() {
  const [kind, setKind] = useState<CaseKind>("return"),
    [page, setPage] = useState(0);
  const { data, error, loading, reload } = useMemberData(
    `${casePath(kind)}?offset=${page * 25}`,
    parseCases,
  );
  return (
    <ScrollView contentContainerStyle={ui.page}>
      <Text style={ui.title}>Returns and disputes</Text>
      <Button
        label={kind === "return" ? "Show disputes" : "Show returns"}
        onPress={() => {
          setKind((k) => (k === "return" ? "dispute" : "return"));
          setPage(0);
        }}
      />
      <Button
        label={kind === "return" ? "Request a return" : "Open a dispute"}
        onPress={() =>
          router.push({ pathname: "/case-create", params: { kind } })
        }
      />
      <Button label="Refresh cases" disabled={loading} onPress={reload} />
      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text style={ui.error}>{error}</Text>
      ) : data?.length === 0 ? (
        <Text style={ui.copy}>
          No {kind === "return" ? "returns" : "disputes"} on this page.
        </Text>
      ) : (
        data?.map((c) => (
          <View key={c.id} style={ui.card}>
            <Text style={ui.link}>{c.itemTitle}</Text>
            <Text style={ui.copy}>
              {caseLabel(c.status)} · You are the {c.role}
            </Text>
            <Text style={ui.copy}>
              {caseLabel(c.reason)} ·{" "}
              {new Date(c.createdAt).toLocaleDateString()}
            </Text>
            <Button
              label="Open case"
              onPress={() =>
                router.push({
                  pathname: "/case-detail",
                  params: { kind, id: c.id },
                })
              }
            />
          </View>
        ))
      )}
      {page > 0 && (
        <Button
          label="Previous cases"
          disabled={loading}
          onPress={() => setPage((n) => n - 1)}
        />
      )}{" "}
      {data?.length === 25 && (
        <Button
          label="More cases"
          disabled={loading}
          onPress={() => setPage((n) => n + 1)}
        />
      )}
    </ScrollView>
  );
}
