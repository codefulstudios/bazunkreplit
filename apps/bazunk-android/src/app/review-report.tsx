import { useRef, useState } from "react";
import { ScrollView, Text, TextInput } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SellerAccess } from "../components/SellerAccess";
import { Button, ui } from "../components/UI";
import { useMemberRequest } from "../hooks";
import { parseReviewSaved, reportReasons } from "../reviews";
export default function ReportReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <SellerAccess>
      <Report key={id} id={id || ""} />
    </SellerAccess>
  );
}
function Report({ id }: { id: string }) {
  const request = useMemberRequest(),
    lock = useRef(false);
  const [reason, setReason] = useState(""),
    [details, setDetails] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false),
    [error, setError] = useState("");
  async function submit() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      parseReviewSaved(
        await request(`/reviews/${encodeURIComponent(id)}/report`, {
          method: "POST",
          body: { reason, details },
        }),
      );
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not report review.");
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
      <Text style={ui.title}>Report review</Text>
      {saved ? (
        <Text style={ui.copy}>
          Your report was sent to Bazunk for moderation. Reporting does not
          automatically remove a review.
        </Text>
      ) : (
        <>
          <Text style={ui.copy}>Choose why this review should be checked.</Text>
          {reportReasons.map(([code, label]) => (
            <Button
              key={code}
              label={`${reason === code ? "✓ " : ""}${label}`}
              disabled={busy}
              onPress={() => setReason(code)}
            />
          ))}
          <TextInput
            accessibilityLabel="Report details"
            style={ui.input}
            multiline
            maxLength={1000}
            value={details}
            onChangeText={setDetails}
            editable={!busy}
            placeholder="Additional details (optional)"
          />
          <Button
            label={busy ? "Sending…" : "Send report"}
            disabled={busy || !reason}
            onPress={() => void submit()}
          />
          {!!error && <Text style={ui.error}>{error}</Text>}
        </>
      )}
    </ScrollView>
  );
}
