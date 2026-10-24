import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { getJson } from "../api";
import { Button, ui } from "../components/UI";
import { CaseLink } from "../components/CaseLink";
import {
  legalRegions,
  parseLegalDocument,
  searchLegalSections,
  type LegalKind,
  type LegalRegion,
  type LegalDocument,
} from "../legal";
export default function Legal() {
  const params = useLocalSearchParams<{ kind: string; region: string }>();
  const [kind, setKind] = useState<LegalKind>(
      params.kind === "privacy" ? "privacy" : "terms",
    ),
    [region, setRegion] = useState<LegalRegion>(
      params.region === "eu" ? "eu" : params.region === "usa" ? "usa" : "uk",
    );
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={ui.page}
    >
      <Text accessibilityRole="header" style={ui.title}>
        Terms and privacy
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {(["terms", "privacy"] as const).map((k) => (
          <Choice
            key={k}
            label={k === "terms" ? "Terms of Service" : "Privacy Policy"}
            selected={kind === k}
            onPress={() => setKind(k)}
          />
        ))}
      </View>
      <Text style={ui.copy}>
        Choose the region you want to read. This selection does not determine
        your legal location or record consent.
      </Text>
      <View style={{ gap: 8 }}>
        {legalRegions.map((r) => (
          <Choice
            key={r.id}
            label={r.label}
            selected={region === r.id}
            onPress={() => setRegion(r.id)}
          />
        ))}
      </View>
      <Document key={`${kind}:${region}`} kind={kind} region={region} />
      <CaseLink
        url="https://bazunk.com/support"
        label="Open website Support Centre"
      />
    </ScrollView>
  );
}
function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: selected ? "#1559d6" : "#ccd6e7",
        backgroundColor: selected ? "#1559d6" : "#fff",
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: selected ? "#fff" : "#1559d6",
        }}
      >
        {label}
        {selected ? " ✓" : ""}
      </Text>
    </Pressable>
  );
}
function Document({ kind, region }: { kind: LegalKind; region: LegalRegion }) {
  const [data, setData] = useState<LegalDocument | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0),
    [query, setQuery] = useState("");
  useFocusEffect(
    useCallback(() => {
      const c = new AbortController();
      setLoading(true);
      setError("");
      setData(null);
      void getJson(`/legal/${kind}/${region}?refresh=${retry}`, c.signal)
        .then((raw) => {
          const d = parseLegalDocument(raw, kind, region);
          if (!c.signal.aborted) setData(d);
        })
        .catch((e) => {
          if (!c.signal.aborted)
            setError(
              e instanceof Error ? e.message : "Could not load the policy.",
            );
        })
        .finally(() => {
          if (!c.signal.aborted) setLoading(false);
        });
      return () => c.abort();
    }, [kind, region, retry]),
  );
  if (loading) return <ActivityIndicator accessibilityLabel="Loading policy" />;
  if (error || !data)
    return (
      <View style={ui.card}>
        <Text accessibilityRole="alert" style={ui.error}>
          {error || "Policy unavailable."}
        </Text>
        <Button label="Retry policy" onPress={() => setRetry((n) => n + 1)} />
      </View>
    );
  const regional = searchLegalSections(data.regionalSections, query),
    shared = searchLegalSections(data.sharedSections, query);
  return (
    <View style={{ gap: 16 }}>
      <View style={ui.card}>
        <Text accessibilityRole="header" style={ui.title}>
          {data.title}
        </Text>
        <Text style={ui.copy}>
          {data.regionLabel} · Last updated: {data.updatedLabel}
        </Text>
        <Text selectable style={ui.copy}>
          {data.summary}
        </Text>
        <Text selectable style={ui.copy}>
          {data.regionalSummary}
        </Text>
        <Button label="Refresh policy" onPress={() => setRetry((n) => n + 1)} />
      </View>
      <TextInput
        accessibilityLabel="Search policy sections"
        placeholder="Search this policy"
        value={query}
        onChangeText={setQuery}
        maxLength={120}
        style={ui.input}
      />
      {!!query && (
        <>
          <Text style={ui.copy}>
            Showing {regional.length + shared.length} matching sections. Clear
            search to read the full policy.
          </Text>
          <Button label="Clear search" onPress={() => setQuery("")} />
        </>
      )}
      <Text accessibilityRole="header" style={ui.link}>
        {data.regionLabel} provisions
      </Text>
      {regional.map((s, i) => (
        <View key={`regional-${i}`} style={ui.card}>
          <Text accessibilityRole="header" style={ui.link}>
            {s.title}
          </Text>
          <Text selectable style={ui.copy}>
            {s.body}
          </Text>
        </View>
      ))}
      <Text accessibilityRole="header" style={ui.link}>
        Shared {kind === "terms" ? "marketplace terms" : "privacy notice"}
      </Text>
      {shared.map((s, i) => (
        <View key={`shared-${i}`} style={ui.card}>
          <Text accessibilityRole="header" style={ui.link}>
            {s.title}
          </Text>
          <Text selectable style={ui.copy}>
            {s.body}
          </Text>
        </View>
      ))}
    </View>
  );
}
