import {ActivityIndicator, Text, View} from './ThemedNative';
import { useRef, useState } from "react";

import { Button, ui } from "./UI";
import { useMemberData } from "../hooks";
import { parseOwnListings } from "../api";
export function useTask() {
  const lock = useRef(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function run(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Request failed. Refresh before retrying.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { busy, error, notice, setNotice, run };
}
export function Feedback({ error, notice }: { error: string; notice: string }) {
  return (
    <>
      {!!error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
      {!!notice && <Text style={ui.copy}>{notice}</Text>}
    </>
  );
}
export function ListingPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const [page, setPage] = useState(0);
  const { data, error, loading, reload } = useMemberData(
    `/mobile/listings/mine?offset=${page * 25}`,
    parseOwnListings,
  );
  return (
    <View style={{ gap: 8 }}>
      <Text style={ui.link}>Choose one of your active listings</Text>
      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <>
          <Text style={ui.error}>{error}</Text>
          <Button label="Retry listings" onPress={reload} />
        </>
      ) : (
        data
          ?.filter((l) => l.status === "active")
          .map((l) => (
            <Button
              key={l.id}
              label={(value === l.id ? "✓ " : "") + l.title}
              disabled={disabled}
              onPress={() => onChange(l.id)}
            />
          ))
      )}
      {page > 0 && (
        <Button
          label="Previous listings"
          disabled={disabled || loading}
          onPress={() => setPage((p) => p - 1)}
        />
      )}{" "}
      {data?.length === 25 && (
        <Button
          label="More listings"
          disabled={disabled || loading}
          onPress={() => setPage((p) => p + 1)}
        />
      )}
    </View>
  );
}
