import {ThemeIcon} from '../components/ThemeIdentity';
import {useTheme} from '../theme';
import {StatusBar} from 'expo-status-bar';
import {Pressable, Text} from '../components/ThemedNative';
import {BrandLogo} from '../components/BrandLogo';
import {MarketplaceSettings,MarketplaceGate} from '../components/MarketplaceSettings';
import {AppMenu,useAppMenu} from '../components/AppMenu';
import {Startup} from '../components/Startup';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, router } from "expo-router";

import { ClerkProvider } from "@clerk/expo";
import { AppCart } from "../cart";
import { tokenCache } from "@clerk/expo/token-cache";
// Let Expo Router hide the native splash when the first screen is ready.
// Do not hold startup behind authentication or marketplace network requests.
SplashScreen.setOptions({ duration: 350, fade: true });

function Navigation() {
  const openMenu=useAppMenu();const {palette:p,mode}=useTheme();
  return (
    <><StatusBar style={mode==='dark'?'light':'dark'}/><Stack
      screenOptions={{
        headerStyle: { backgroundColor: p.surface },
        contentStyle: {backgroundColor: p.background},
        headerShadowVisible: false,
        headerRight:()=> <Pressable accessibilityRole="button" accessibilityLabel="Open menu" onPress={openMenu} style={{padding:12}}><Text style={{fontSize:22,color:"#102A56"}}>☰</Text></Pressable>,
        headerTintColor: p.text,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Bazunk",
          headerTitle:()=> <BrandLogo style={{width:132,height:36}}/>,
          headerLeft: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="Open menu" onPress={openMenu} style={{ padding: 10 }}>
              <Text style={{ color: "#102A56", fontWeight: "700" }}>☰</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="Open cart" onPress={() => router.push("/cart")} style={{ padding: 10 }}>
              <ThemeIcon placement="header_cart" fallback="cart"/>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="support" options={{title:"Help & support"}}/>
      <Stack.Screen name="browse" options={{title:"Browse listings"}} />
      <Stack.Screen name="auctions" options={{ title: "Auctions" }} />
      <Stack.Screen name="auction" options={{ title: "Auction details" }} />
      <Stack.Screen
        name="auction-create"
        options={{ title: "Create auction" }}
      />
      <Stack.Screen name="my-auctions" options={{ title: "My auctions" }} />
      <Stack.Screen name="rewards" options={{ title: "Rewards" }} />
      <Stack.Screen name="arcade" options={{ title: "Games arcade" }} />
      <Stack.Screen name="game" options={{ title: "Play and earn" }} />
      <Stack.Screen name="classifieds" options={{ title: "Classifieds" }} />
      <Stack.Screen name="classified" options={{ title: "Classified ad" }} />
      <Stack.Screen
        name="classified-edit"
        options={{ title: "Post / edit ad" }}
      />
      <Stack.Screen name="flash-sales" options={{ title: "Flash sales" }} />
      <Stack.Screen
        name="flash-sale"
        options={{ title: "Flash-sale details" }}
      />
      <Stack.Screen
        name="flash-create"
        options={{ title: "Create flash sale" }}
      />
      <Stack.Screen
        name="my-specials"
        options={{ title: "My ads and sales" }}
      />
      <Stack.Screen
        name="seller-reviews"
        options={{ title: "Seller reviews" }}
      />
      <Stack.Screen name="order-review" options={{ title: "Order reviews" }} />
      <Stack.Screen name="review-report" options={{ title: "Report review" }} />
      <Stack.Screen name="stock" options={{ title: "Remaining stock" }} />
      <Stack.Screen name="deal-payment" options={{ title: "Deal payment" }} />
      <Stack.Screen name="offers" options={{ title: "My offers" }} />
      <Stack.Screen name="offer-create" options={{ title: "Make an offer" }} />
      <Stack.Screen name="cases" options={{ title: "Returns and disputes" }} />
      <Stack.Screen name="case-create" options={{ title: "Open a case" }} />
      <Stack.Screen name="case-detail" options={{ title: "Case details" }} />
      <Stack.Screen name="legal" options={{ title: "Terms and privacy" }} />
      <Stack.Screen name="special-payment" options={{ title: "Checkout" }} />
      <Stack.Screen name="credits" options={{ title: "Credit wallet" }} />
      <Stack.Screen name="promotions" options={{ title: "Promote listings" }} />
      <Stack.Screen
        name="verification"
        options={{ title: "Seller verification" }}
      />
      <Stack.Screen name="importers" options={{ title: "Import inventory" }} />
      <Stack.Screen name="live" options={{ title: "Live selling" }} />
      <Stack.Screen name="more" options={{ title: "Bazunk menu" }} />
      <Stack.Screen name="saved" options={{ title: "Saved items" }} />
      <Stack.Screen name="messages" options={{ title: "Messages" }} />
      <Stack.Screen name="conversation" options={{ title: "Conversation" }} />
      <Stack.Screen name="cart" options={{ title: "Your cart" }} />
      <Stack.Screen name="order-details" options={{ title: "Order details" }} />
      <Stack.Screen name="orders" options={{ title: "Orders" }} />
      <Stack.Screen name="listing" options={{ title: "Listing details" }} />
      <Stack.Screen name="sell" options={{ title: "Sell an item" }} />
      <Stack.Screen name="my-listings" options={{ title: "My listings" }} />
      <Stack.Screen name="account" options={{ title: "Your Bazunk account" }} />
    </Stack></>
  );
}
export default function Layout() {
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return <Startup><MarketplaceSettings><AppMenu>{key ? (
    <ClerkProvider publishableKey={key} tokenCache={tokenCache}>
      <AppCart>
        <MarketplaceGate><Navigation /></MarketplaceGate>
      </AppCart>
    </ClerkProvider>
  ) : (
    <AppCart>
      <MarketplaceGate><Navigation /></MarketplaceGate>
    </AppCart>
  )}</AppMenu></MarketplaceSettings></Startup>;
}

