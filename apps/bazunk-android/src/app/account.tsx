import {useTheme} from '../theme';
import {ActivityIndicator, Pressable, ScrollView, Text, View} from '../components/ThemedNative';
import { Button } from "../components/UI";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth, useClerk, useUser } from "@clerk/expo";
import { AuthView, UserButton } from "@clerk/expo/native";
import { useEffect, useState } from "react";
import {AppState, Modal, StyleSheet} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { loadAccount, type Account } from "../api";

export default function AccountScreen() {
  return process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
    <ConnectedAccount />
  ) : (
    <View style={styles.page}>
      <Text style={styles.title}>Your Bazunk account</Text>
      <Button label="Terms and privacy" onPress={() => router.push("/legal")} />
      <Text style={styles.copy}>
        Account sign-in is not configured in this build yet. Browsing is still
        available.
      </Text>
    </View>
  );
}
function ConnectedAccount() {
  const {returnTo}=useLocalSearchParams<{returnTo?:string}>();
  const {palette:p}=useTheme();
  const { isLoaded, isSignedIn, getToken } = useAuth({
    treatPendingAsSignedOut: false,
  });
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const userId = user?.id;
  useEffect(() => {
    // Close the native auth presentation after session activation, including OAuth.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isLoaded && isSignedIn) setOpen(false);
  }, [isLoaded, isSignedIn]);
  // A session change starts a fresh authenticated request and clears the previous profile.
  useEffect(() => {
    const controller = new AbortController();
    // Resetting account data when the external session changes is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAccount(null);
    setError("");
    if (!isSignedIn || !userId) {
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    void (async () => {
      try {
        const token = await getToken();
        if (!token)
          throw new Error(
            "Your session expired. Please sign out and sign in again.",
          );
        const data = await loadAccount(token, controller.signal);
        if (!controller.signal.aborted) setAccount(data);
      } catch (e) {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Could not load your account.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [isSignedIn, userId, getToken, retry]);
  useEffect(() => {
    const subscription=AppState.addEventListener('change',state=>{if(state==='active')setRetry(n=>n+1)});
    return ()=>subscription.remove();
  }, []);
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await signOut();
      setAccount(null);
    } catch {
      setError("Sign-out failed. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.title}>Your Bazunk account</Text>
        <Button
          label="Terms and privacy"
          onPress={() => router.push("/legal")}
        />
        {!isLoaded ? (
          <ActivityIndicator accessibilityLabel="Loading account" />
        ) : isSignedIn ? (
          <>
            <View style={styles.card}>
              <UserButton />
              {returnTo==='cart' && <Button label="Continue to your cart" onPress={()=>router.replace('/cart')}/>}
              <Text style={styles.subtitle}>
                {account?.name || user?.fullName || "Bazunk member"}
              </Text>
              <Text style={styles.copy}>
                {account?.email || user?.primaryEmailAddress?.emailAddress}
              </Text>
              {account?.username && (
                <Text style={styles.copy}>@{account.username}</Text>
              )}
            </View>
            {loading && (
              <ActivityIndicator accessibilityLabel="Connecting to Bazunk" />
            )}
            {account && (
              <Text style={styles.copy}>
                Connected to your Bazunk account. Your profile is
                shared with the website.
              </Text>
            )}
            <Pressable
              style={styles.button}
              accessibilityRole="button"
              onPress={() => router.push("/more")}
            >
              <Text style={styles.buttonText}>
                Messages, saved items and orders
              </Text>
            </Pressable>
            <Pressable
              style={styles.button}
              accessibilityRole="button"
              onPress={() => router.push("/my-listings")}
            >
              <Text style={styles.buttonText}>My listings</Text>
            </Pressable>
            <Pressable
              style={styles.button}
              accessibilityRole="button"
              onPress={() => setRetry((n) => n + 1)}
              disabled={loading || busy}
            >
              <Text style={styles.buttonText}>Refresh account</Text>
            </Pressable>
            <Pressable
              style={styles.secondary}
              accessibilityRole="button"
              onPress={() => void logout()}
              disabled={busy}
            >
              <Text style={styles.link}>
                {busy ? "Signing out…" : "Sign out"}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.copy}>
              Use your existing Bazunk login or create an account. Your listings
              and account stay connected to the same marketplace.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.button}
              onPress={() => setOpen(true)}
            >
              <Text style={styles.buttonText}>Sign in or create account</Text>
            </Pressable>
          </>
        )}
        {!!error && (
          <View accessibilityLiveRegion="polite">
            <Text style={styles.error}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setRetry((n) => n + 1)}
            >
              <Text style={styles.link}>Retry account connection</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      <Modal
        visible={open && !isSignedIn}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={{ flex: 1,backgroundColor:p.background }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close sign in"
            style={styles.secondary}
            onPress={() => setOpen(false)}
          >
            <Text style={styles.link}>Close</Text>
          </Pressable>
          <AuthView mode="signInOrUp" onDismiss={() => setOpen(false)} />
        </SafeAreaView>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 24, gap: 20, backgroundColor: "#f3f6fc" },
  title: { fontSize: 28, fontWeight: "800", color: "#1559d6" },
  subtitle: { fontSize: 22, fontWeight: "700", color: "#172442" },
  copy: { fontSize: 16, lineHeight: 24, color: "#344563" },
  card: { backgroundColor: "#fff", padding: 24, borderRadius: 20, gap: 14 },
  button: {
    backgroundColor: "#1559d6",
    borderRadius: 14,
    padding: 17,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondary: { padding: 16, alignItems: "center" },
  link: { color: "#1559d6", fontSize: 16, fontWeight: "700" },
  error: { color: "#ae2339", fontSize: 16, marginBottom: 12 },
});
