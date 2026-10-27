import {Text, View} from './ThemedNative';
import * as Linking from "expo-linking";
import { useState } from "react";

import { caseLink } from "../cases";
import { Button, ui } from "./UI";
export function CaseLink({ url, label }: { url: string; label: string }) {
  const [error, setError] = useState("");
  async function open() {
    setError("");
    try {
      await Linking.openURL(caseLink(url));
    } catch {
      setError("Could not open this link.");
    }
  }
  return (
    <View style={{ gap: 8 }}>
      <Button label={label} onPress={() => void open()} />
      {!!error && <Text style={ui.error}>{error}</Text>}
    </View>
  );
}
