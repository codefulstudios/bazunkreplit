import {ActivityIndicator, ScrollView, Text} from '../components/ThemedNative';

import * as WebBrowser from "expo-web-browser";
import { SellerAccess } from "../components/SellerAccess";
import { Button, ui } from "../components/UI";
import { Feedback, useTask } from "../components/BusinessUI";
import { useMemberData, useMemberRequest } from "../hooks";
import { parseVerification, record } from "../business";
import { caseLink } from "../cases";
export default function Verification() {
  return (
    <SellerAccess>
      <Verify />
    </SellerAccess>
  );
}
function Verify() {
  const current = useMemberData("/verification/status", parseVerification),
    request = useMemberRequest(),
    task = useTask();
  return (
    <ScrollView contentContainerStyle={ui.page}>
      <Text style={ui.title}>Seller verification</Text>
      <Text style={ui.copy}>
        Identity checks are completed securely with Didit in your browser.
        Bazunk receives the result; this screen does not collect identity
        documents.
      </Text>
      {current.loading ? (
        <ActivityIndicator />
      ) : current.error ? (
        <Text style={ui.error}>{current.error}</Text>
      ) : (
        current.data && (
          <>
            <Text style={ui.title}>
              {String(current.data.verificationStatus)}
            </Text>
            {!!current.data.verificationCode && (
              <Text selectable style={ui.copy}>
                Verification code: {String(current.data.verificationCode)}
              </Text>
            )}
            {!current.data.configured && (
              <Text style={ui.copy}>
                Verification is currently unavailable.
              </Text>
            )}
            {current.data.configured &&
              !["verified", "pending"].includes(
                String(current.data.verificationStatus),
              ) && (
                <Button
                  label="Start verification"
                  disabled={task.busy}
                  onPress={() =>
                    void task.run(async () => {
                      const r = record(
                        await request("/verification/session", {
                          method: "POST",
                        }),
                      );
                      if (typeof r.url !== "string")
                        throw Error("Verification link was not returned.");
                      await WebBrowser.openBrowserAsync(caseLink(r.url));
                      task.setNotice(
                        "Return here and refresh to check your result. Closing the browser does not mean verification passed.",
                      );
                      current.reload();
                    })
                  }
                />
              )}
          </>
        )
      )}
      {current.data?.verificationStatus === "pending" && (
        <Text style={ui.copy}>
          Your check is pending. Finish the existing browser session, then
          refresh. Contact Support if you can no longer access it.
        </Text>
      )}
      <Button
        label="Refresh verification status"
        disabled={task.busy || current.loading}
        onPress={current.reload}
      />
      <Feedback {...task} />
    </ScrollView>
  );
}
