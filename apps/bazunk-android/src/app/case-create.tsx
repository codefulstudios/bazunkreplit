import { useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SellerAccess } from "../components/SellerAccess";
import { Button, ui } from "../components/UI";
import { useMemberData, useMemberRequest } from "../hooks";
import {
  casePath,
  caseLabel,
  caseCreated,
  parseEligible,
  returnReasons,
  disputeReasons,
  conditions,
  type CaseKind,
} from "../cases";
export default function NewCase() {
  const params = useLocalSearchParams<{ kind: string; orderId: string }>();
  const [kind, setKind] = useState<CaseKind>(
    params.kind === "dispute" ? "dispute" : "return",
  );
  return (
    <SellerAccess>
      <Form
        key={`${kind}:${params.orderId}`}
        kind={kind}
        orderId={params.orderId || ""}
        switchKind={() =>
          setKind((k) => (k === "return" ? "dispute" : "return"))
        }
      />
    </SellerAccess>
  );
}
function Form({
  kind,
  orderId,
  switchKind,
}: {
  kind: CaseKind;
  orderId: string;
  switchKind: () => void;
}) {
  const [page, setPage] = useState(0),
    [selected, setSelected] = useState(orderId),
    [reason, setReason] = useState(
      kind === "return" ? "not_as_described" : "item_not_received",
    ),
    [condition, setCondition] = useState("like_new"),
    [description, setDescription] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    request = useMemberRequest();
  const eligible = useMemberData(
    `${casePath(kind)}/eligible-orders?offset=${page * 25}&orderId=${encodeURIComponent(orderId)}`,
    parseEligible,
  );
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const id = caseCreated(
        await request(casePath(kind), {
          method: "POST",
          body: { orderId: selected, reason, condition, description },
        }),
      );
      router.replace({ pathname: "/case-detail", params: { kind, id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit case.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={ui.page}
    >
      <Text style={ui.title}>
        {kind === "return" ? "Request a return" : "Open a dispute"}
      </Text>
      <Button
        label={kind === "return" ? "Switch to dispute" : "Switch to return"}
        disabled={busy}
        onPress={switchKind}
      />
      <Text style={ui.copy}>
        {kind === "return"
          ? "Requests after dispatch are reviewed before approval."
          : "The current dispute window is 30 days from order creation. Contact Support if your order is not listed."}
      </Text>
      {eligible.loading ? (
        <ActivityIndicator />
      ) : eligible.error ? (
        <>
          <Text style={ui.error}>{eligible.error}</Text>
          <Button label="Retry eligible orders" onPress={eligible.reload} />
        </>
      ) : (
        <>
          {eligible.data?.length === 0 && (
            <Text style={ui.copy}>
              No eligible orders on this page. Check your existing cases or
              contact Support.
            </Text>
          )}
          {eligible.data?.map((o) => (
            <Button
              key={o.id}
              label={`${selected === o.id ? "✓ " : ""}${o.title} · ${o.id}`}
              disabled={busy}
              onPress={() => setSelected(o.id)}
            />
          ))}
          {page > 0 && (
            <Button
              label="Previous orders"
              onPress={() => setPage((n) => n - 1)}
            />
          )}{" "}
          {eligible.data?.length === 25 && (
            <Button label="More orders" onPress={() => setPage((n) => n + 1)} />
          )}
        </>
      )}
      <Text style={ui.link}>Reason</Text>
      {(kind === "return" ? returnReasons : disputeReasons).map((r) => (
        <Button
          key={r}
          label={`${reason === r ? "✓ " : ""}${caseLabel(r)}`}
          disabled={busy}
          onPress={() => setReason(r)}
        />
      ))}
      {kind === "return" && (
        <>
          <Text style={ui.link}>Item condition</Text>
          {conditions.map((c) => (
            <Button
              key={c}
              label={`${condition === c ? "✓ " : ""}${caseLabel(c)}`}
              disabled={busy}
              onPress={() => setCondition(c)}
            />
          ))}
        </>
      )}
      <TextInput
        accessibilityLabel="Describe the issue"
        multiline
        maxLength={4000}
        style={ui.input}
        value={description}
        onChangeText={setDescription}
        editable={!busy}
        placeholder="Describe what happened"
      />
      <Button
        label={busy ? "Submitting…" : "Submit request"}
        disabled={
          busy ||
          !selected ||
          !description.trim() ||
          eligible.loading ||
          !!eligible.error ||
          !eligible.data?.some((o) => o.id === selected)
        }
        onPress={() => void save()}
      />
      {!!error && <Text style={ui.error}>{error}</Text>}
      <Text style={ui.copy}>
        Check My cases after an interrupted request before submitting again.
        Submission does not automatically approve a return or issue a refund.
      </Text>
    </ScrollView>
  );
}
