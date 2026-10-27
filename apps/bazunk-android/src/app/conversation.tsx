import {ActivityIndicator, ScrollView, Text, TextInput, View} from '../components/ThemedNative';
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {KeyboardAvoidingView} from 'react-native';
import { useMemberData, useMemberRequest } from "../hooks";
import { SellerAccess } from "../components/SellerAccess";
import { Button, ui } from "../components/UI";
type Message = {
  id: number;
  senderId: "me" | "them";
  text: string;
  timestamp: string;
};
function parseMessage(x: unknown): Message {
  const m = x as Message;
  if (
    !m ||
    !Number.isSafeInteger(m.id) ||
    m.id < 1 ||
    !["me", "them"].includes(m.senderId) ||
    typeof m.text !== "string" ||
    typeof m.timestamp !== "string" ||
    !Number.isFinite(Date.parse(m.timestamp))
  )
    throw Error("Unexpected message response.");
  return m;
}
function parse(data: unknown): Message[] {
  const x = data as { messages?: unknown };
  if (!x || !Array.isArray(x.messages))
    throw Error("Unexpected conversation response.");
  return x.messages.map(parseMessage);
}
export default function Conversation() {
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  return (
    <SellerAccess>
      <Chat key={id} id={id} title={title} />
    </SellerAccess>
  );
}
function Chat({ id, title }: { id: string; title: string }) {
  const valid = /^\d+$/.test(id || "");
  const { data, error, loading, reload } = useMemberData(
    `/mobile/community/messages/conversations/${valid ? id : "invalid"}`,
    parse,
  );
  const request = useMemberRequest();
  const [text, setText] = useState("");
  const [sent, setSent] = useState<Message[]>([]);
  const [sendError, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function send() {
    if (lock.current || !text.trim()) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const message = parseMessage(
        await request(
          `/mobile/community/messages/conversations/${id}/messages`,
          { method: "POST", body: { text: text.trim() } },
        ),
      );
      setSent((prev) => [...prev, message]);
      setText("");
    } catch (e) {
      setError(
        `${e instanceof Error ? e.message : "Could not send message."} Refresh before resending if the connection was interrupted.`,
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  const messages = [
    ...(data || []),
    ...sent.filter((s) => !data?.some((m) => m.id === s.id)),
  ].sort((a, b) => a.id - b.id);
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
      <ScrollView
        contentContainerStyle={ui.page}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={ui.title}>{title || "Conversation"}</Text>
        <Button
          label="Refresh messages"
          disabled={loading || busy}
          onPress={reload}
        />
        {loading && <ActivityIndicator />}
        {!!error && <Text style={ui.error}>{error}</Text>}
        {!loading && !error && messages.length === 0 && (
          <Text style={ui.copy}>
            No messages yet. Write your first message below.
          </Text>
        )}
        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              ui.card,
              {
                backgroundColor: m.senderId === "me" ? "#e0e9ff" : "#fff",
                alignSelf: m.senderId === "me" ? "flex-end" : "flex-start",
                maxWidth: "95%",
              },
            ]}
          >
            <Text style={ui.copy}>{m.text}</Text>
            <Text style={{ color: "#61708b", fontSize: 12 }}>
              {new Date(m.timestamp).toLocaleString()}
            </Text>
          </View>
        ))}
        {messages.length > 0 && (
          <Button
            label="Refresh latest messages"
            disabled={loading || busy}
            onPress={reload}
          />
        )}{" "}
        {!!sendError && (
          <Text accessibilityLiveRegion="polite" style={ui.error}>
            {sendError}
          </Text>
        )}
        <TextInput
          accessibilityLabel="Message"
          style={[ui.input, { minHeight: 80 }]}
          multiline
          maxLength={2000}
          placeholder="Write a message…"
          value={text}
          onChangeText={setText}
          editable={!busy}
        />
        <Button
          label={busy ? "Sending…" : "Send message"}
          disabled={busy || loading || !valid || !data || !text.trim()}
          onPress={() => void send()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
