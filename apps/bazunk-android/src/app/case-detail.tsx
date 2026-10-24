import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SellerAccess } from "../components/SellerAccess";
import { CaseLink } from "../components/CaseLink";
import { Button, ui } from "../components/UI";
import { useMemberData, useMemberRequest } from "../hooks";
import {
  casePath,
  caseLabel,
  parseCase,
  parseThread,
  caseSaved,
  messageRef,
  type MemberCase,
  type CaseKind,
} from "../cases";
export default function CaseDetails() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  return (
    <SellerAccess>
      <Details
        key={`${kind}:${id}`}
        kind={kind === "dispute" ? "dispute" : "return"}
        id={id || ""}
      />
    </SellerAccess>
  );
}
function Details({ kind, id }: { kind: CaseKind; id: string }) {
  const { data, error, loading, reload } = useMemberData(
    `${casePath(kind)}/${encodeURIComponent(id)}`,
    parseCase,
  );
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={ui.page}
    >
      <Text style={ui.title}>
        {kind === "return" ? "Return request" : "Dispute"}
      </Text>
      <Button label="Refresh case" disabled={loading} onPress={reload} />
      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text style={ui.error}>{error}</Text>
      ) : (
        data && (
          <>
            <View style={ui.card}>
              <Text style={ui.link}>{data.itemTitle}</Text>
              <Text style={ui.copy}>
                {data.id} · {caseLabel(data.status)} · You are the {data.role}
              </Text>
              <Text style={ui.copy}>
                {caseLabel(data.reason)}
                {data.condition ? ` · ${caseLabel(data.condition)}` : ""}
              </Text>
              <Text style={ui.copy}>{data.description}</Text>
              {!!data.sellerResponse && (
                <Text style={ui.copy}>
                  Seller response: {data.sellerResponse}
                </Text>
              )}
              {!!data.resolution && (
                <Text style={ui.copy}>Resolution: {data.resolution}</Text>
              )}
              {!!data.refundAmount && (
                <Text style={ui.copy}>
                  Recorded refund amount: £{data.refundAmount}
                </Text>
              )}
              {!!data.returnInstructions && (
                <Text style={ui.copy}>
                  Return instructions: {data.returnInstructions}
                </Text>
              )}
              {data.labelUrl && (
                <CaseLink
                  url={data.labelUrl}
                  label="Open supplied return label"
                />
              )}
              {data.tracking && (
                <Text style={ui.copy}>
                  Return tracking: {data.carrier || ""} {data.tracking}
                </Text>
              )}
            </View>
            {data.canShip && <Ship data={data} reload={reload} />}{" "}
            {kind === "dispute" && <Thread data={data} />}
            <Text style={ui.copy}>
              Follow the case instructions before posting a return. Contact
              Support if no instructions have been provided. Refunds and
              decisions are handled through Bazunk support/admin.
            </Text>
          </>
        )
      )}
    </ScrollView>
  );
}
function Ship({ data, reload }: { data: MemberCase; reload: () => void }) {
  const request = useMemberRequest(),
    lock = useRef(false);
  const [tracking, setTracking] = useState(""),
    [carrier, setCarrier] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      caseSaved(
        await request(
          `${casePath(data.kind)}/${encodeURIComponent(data.id)}/${data.kind === "return" ? "ship" : "return-tracking"}`,
          {
            method: data.kind === "return" ? "PATCH" : "POST",
            body: { tracking, returnTracking: tracking, carrier },
          },
        ),
      );
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save tracking.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={ui.card}>
      <Text style={ui.link}>Post an approved return</Text>
      <TextInput
        accessibilityLabel="Return carrier"
        placeholder="Carrier (optional)"
        maxLength={80}
        style={ui.input}
        value={carrier}
        onChangeText={setCarrier}
        editable={!busy}
      />
      <TextInput
        accessibilityLabel="Return tracking"
        placeholder="Tracking number"
        maxLength={200}
        style={ui.input}
        value={tracking}
        onChangeText={setTracking}
        editable={!busy}
      />
      <Button
        label={busy ? "Saving…" : "Confirm return sent"}
        disabled={busy || !tracking.trim()}
        onPress={() =>
          Alert.alert(
            "Return sent?",
            "Confirm you have posted the approved return using the case instructions.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Save tracking", onPress: () => void save() },
            ],
          )
        }
      />
      {!!error && <Text style={ui.error}>{error}</Text>}
    </View>
  );
}
function Thread({ data }: { data: MemberCase }) {
  const [page, setPage] = useState(0),
    [message, setMessage] = useState(""),
    [evidence, setEvidence] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const request = useMemberRequest(),
    lock = useRef(false),
    pending = useRef<{ signature: string; id: string } | null>(null);
  const thread = useMemberData(
    `/disputes/${encodeURIComponent(data.id)}/thread?offset=${page * 50}`,
    parseThread,
  );
  async function send() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const signature = JSON.stringify([message, evidence]);
    if (pending.current?.signature !== signature)
      pending.current = { signature, id: messageRef() };
    try {
      caseSaved(
        await request(`/disputes/${encodeURIComponent(data.id)}/message`, {
          method: "POST",
          body: {
            message,
            evidenceUrl: evidence,
            requestId: pending.current.id,
          },
        }),
      );
      pending.current = null;
      setMessage("");
      setEvidence("");
      setPage(0);
      thread.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Message could not be saved.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 12 }}>
      <Text style={ui.link}>Case conversation</Text>
      <Button
        label="Refresh messages"
        disabled={thread.loading}
        onPress={thread.reload}
      />
      {thread.loading ? (
        <ActivityIndicator />
      ) : thread.error ? (
        <Text style={ui.error}>{thread.error}</Text>
      ) : (
        thread.data?.map((m) => (
          <View key={m.id} style={ui.card}>
            <Text style={ui.link}>
              {m.role === "admin" ? "Bazunk support" : m.role} ·{" "}
              {new Date(m.createdAt).toLocaleString()}
            </Text>
            <Text style={ui.copy}>{m.body}</Text>
            {m.evidenceUrl && (
              <CaseLink url={m.evidenceUrl} label="Open evidence link" />
            )}
          </View>
        ))
      )}
      {thread.data?.length === 50 && (
        <Button label="Older messages" onPress={() => setPage((p) => p + 1)} />
      )}{" "}
      {page > 0 && (
        <Button label="Newer messages" onPress={() => setPage((p) => p - 1)} />
      )}{" "}
      {data.canMessage ? (
        <>
          <TextInput
            accessibilityLabel="Case message"
            placeholder="Message for the case"
            multiline
            maxLength={4000}
            value={message}
            onChangeText={setMessage}
            editable={!busy}
            style={ui.input}
          />
          <TextInput
            accessibilityLabel="Evidence link"
            placeholder="HTTPS evidence link (optional)"
            autoCapitalize="none"
            maxLength={2048}
            value={evidence}
            onChangeText={setEvidence}
            editable={!busy}
            style={ui.input}
          />
          <Button
            label={busy ? "Sending…" : "Send message"}
            disabled={busy || (!message.trim() && !evidence.trim())}
            onPress={() => void send()}
          />
          {!!error && <Text style={ui.error}>{error}</Text>}
        </>
      ) : (
        <Text style={ui.copy}>This case is closed to new messages.</Text>
      )}
    </View>
  );
}
