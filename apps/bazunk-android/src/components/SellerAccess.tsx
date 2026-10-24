import { useAuth } from "@clerk/expo";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";
export function SellerAccess({ children }: { children: ReactNode }) {
  return process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
    <SessionAccess>{children}</SessionAccess>
  ) : (
    <SignInNotice />
  );
}
function SessionAccess({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  if (!isLoaded) return <ActivityIndicator style={{ margin: 32 }} />;
  return isSignedIn ? (
    <View key={userId} style={{ flex: 1 }}>
      {children}
    </View>
  ) : (
    <SignInNotice />
  );
}
function SignInNotice() {
  return (
    <View style={{ padding: 24, gap: 20 }}>
      <Text style={{ fontSize: 20 }}>Sign in to use your Bazunk account.</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/account")}
        style={{ padding: 18, backgroundColor: "#1559d6", borderRadius: 14 }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>Open account</Text>
      </Pressable>
    </View>
  );
}
