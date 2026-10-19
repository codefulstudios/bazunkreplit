import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { AdminDemoCreatorPage } from "@/pages/admin/AdminDemoCreatorPage";
import { useEffect, useRef, useState } from "react";
import { ClerkProvider, ClerkLoaded, ClerkLoading, SignIn, SignUp, useClerk, useAuth } from "@clerk/react";
import { shadcn } from "@clerk/themes";

function ScrollToTop() {
  const [location] = useLocation();
  const firstRoute = useRef(true);

  useEffect(() => {
    // Don't restore an old scroll offset when the storefront is opened or refreshed.
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    const reset = () => {
      if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };
    reset();
    const frame = window.requestAnimationFrame(reset);
    const onPageshow = (event: PageTransitionEvent) => {
      if (event.persisted) reset();
    };
    window.addEventListener("pageshow", onPageshow);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pageshow", onPageshow);
      if ("scrollRestoration" in window.history) window.history.scrollRestoration = "auto";
    };
  }, []);

  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location]);
  return null;
}

function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => setVisible(window.scrollY > 360);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  if (!visible) return null;
  return (
    <button
      type="button"
      aria-label="Back to top"
      title="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}
      className="fixed bottom-6 left-4 sm:left-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#F26B21] text-white shadow-lg border border-orange-300 hover:bg-[#d95512] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 transition-colors"
      data-testid="button-back-to-top"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="m6 12 6-6 6 6"/><path d="M12 6v12"/></svg>
    </button>
  );
}
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { CartDrawer } from "@/components/CartDrawer";
import { ChatwootWidget } from "@/components/ChatwootWidget";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { CategorySection } from "@/components/CategorySection";
import { HomepagePromoCards } from "@/components/HomepagePromoCards";
import { FeaturedListings } from "@/components/FeaturedListings";
import { FeaturedFeatures } from "@/components/FeaturedFeatures";
import { Footer } from "@/components/Footer";
import { RewardsTeaser } from "@/components/RewardsTeaser";
import { AdSlot } from "@/components/AdSlot";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { SellPage } from "@/pages/SellPage";
import { DirectSalePage } from "@/pages/DirectSalePage";
import { SnapSellPage } from "@/pages/SnapSellPage";
import { DashboardPage, MyStorePage } from "@/pages/DashboardPage";
import { ImportersPage } from "@/pages/ImportersPage";
import { ImporterWorkspacePage } from "@/pages/ImporterWorkspacePage";
import { BrowsePage } from "@/pages/BrowsePage";
import { ListingPage } from "@/pages/ListingPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { BundlePage } from "@/pages/BundlePage";
import { ClassifiedsPage } from "@/pages/ClassifiedsPage";
import { MessagesPage } from "@/pages/MessagesPage";
import { SellerProfilePage } from "@/pages/SellerProfilePage";
import { CreditsPage } from "@/pages/CreditsPage";
import { PromotionsPage } from "@/pages/PromotionsPage";
import { SupportPage } from "@/pages/SupportPage";
import { TermsPage } from "@/pages/TermsPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { OffersPage } from "@/pages/OffersPage";
import { LivePage, LiveHubPage } from "@/pages/LivePage";
import { LiveNowStrip } from "@/components/LiveNowStrip";
import { PerksStrip } from "@/components/PerksStrip";
import { OfferProvider } from "@/context/OfferContext";
import { LiveStreamProvider } from "@/context/LiveStreamContext";
import { AdminProvider } from "@/context/AdminContext";
import { SiteSettingsProvider } from "@/context/SiteSettingsContext";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import IntroSplash from "@/components/IntroSplash";
import { UserCurrencySync } from "@/components/UserCurrencySync";
import { AdminLoginPage } from "@/pages/admin/AdminLoginPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminCreditsEconomyPage } from "@/pages/admin/AdminCreditsEconomyPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminSellerCompliancePage } from "@/pages/admin/AdminSellerCompliancePage";
import { SellerCompliancePage } from "@/pages/SellerCompliancePage";
import { AdminAuditLogPage } from "@/pages/admin/AdminAuditLogPage";
import { AdminSystemStatusPage } from "@/pages/admin/AdminSystemStatusPage";
import { AdminSnapSellPage } from "@/pages/admin/AdminSnapSellPage";
import { AdminFeatureFlagsPage } from "@/pages/admin/AdminFeatureFlagsPage";
import { FeatureGate, FeatureVisible } from "@/components/FeatureGate";
import { AdminPaymentsPage } from "@/pages/admin/AdminPaymentsPage";
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage";
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage";
import { AdminEmailsPage } from "@/pages/admin/AdminEmailsPage";
import { AdminProductsPage } from "@/pages/admin/AdminProductsPage";
import { AdminListingsPage } from "@/pages/admin/AdminListingsPage";
import { AdminImportsPage } from "@/pages/admin/AdminImportsPage";
import { AdminImporterControlPage } from "@/pages/admin/AdminImporterControlPage";
import { AdminCashbackPage } from "@/pages/admin/AdminCashbackPage";
import { AdminClassifiedsPage } from "@/pages/admin/AdminClassifiedsPage";
import { AdminDisputesPage } from "@/pages/admin/AdminDisputesPage";
import { AdminReturnsPage } from "@/pages/admin/AdminReturnsPage";
import { AdminAuctionsPage } from "@/pages/admin/AdminAuctionsPage";
import { AuctionsPage } from "@/pages/AuctionsPage";
import { AuctionDetailPage } from "@/pages/AuctionDetailPage";
import { CreateAuctionPage } from "@/pages/CreateAuctionPage";
import { FlashSalesPage } from "@/pages/FlashSalesPage";
import { FlashSaleDetailPage } from "@/pages/FlashSaleDetailPage";
import { CreateFlashSalePage } from "@/pages/CreateFlashSalePage";
import { AdminFlashSalesPage } from "@/pages/admin/AdminFlashSalesPage";
import { AdminSupportPage } from "@/pages/admin/AdminSupportPage";
import { AdminChatwootSettingsPage } from "@/pages/admin/AdminChatwootSettingsPage";
import { SetupWizardPage } from "@/pages/SetupWizardPage";
import VideoPage from "@/pages/VideoPage";
import { RewardsPage } from "@/pages/RewardsPage";
import { AdminRewardsPage } from "@/pages/admin/AdminRewardsPage";
import { AdminPromotionsPage } from "@/pages/admin/AdminPromotionsPage";
import { AdminReviewsPage } from "@/pages/admin/AdminReviewsPage";
import { AdminVerificationPage } from "@/pages/admin/AdminVerificationPage";
import BuyerProtectionPage from "@/pages/BuyerProtectionPage";
import CashbackPage from "@/pages/CashbackPage";
import { ReferralsPage } from "@/pages/ReferralsPage";
import WelcomeNewBuyers from "@/pages/WelcomeNewBuyers";
import { AdminReferralsPage } from "@/pages/admin/AdminReferralsPage";


// ─── Clerk setup ─────────────────────────────────────────────────────────────

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Use the publishable key straight from the environment. (The Replit-era
// publishableKeyFromHost() helper derived a key from the page hostname, which
// produces an invalid key on *.onrender.com and breaks sign-in.)
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

// Only set if you front Clerk with your own proxy. Leave unset on Render.
const clerkProxyUrl = window.location.hostname.endsWith(".onrender.com") ? undefined : (import.meta.env.VITE_CLERK_PROXY_URL as string | undefined) || undefined;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/bazunk-logo.png`,
  },
  variables: {
    colorPrimary: "#F26B21",
    colorForeground: "#ffffff",
    colorMutedForeground: "rgba(255,255,255,0.5)",
    colorDanger: "#ef4444",
    colorBackground: "#1A1D2E",
    colorInput: "#252840",
    colorInputForeground: "#ffffff",
    colorNeutral: "rgba(255,255,255,0.15)",
    fontFamily: '"Outfit", "Inter", sans-serif',
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl shadow-black/50 border border-white/10 bg-[#1A1D2E]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none bg-[#151829]",
    headerTitle: "text-white font-black",
    headerSubtitle: "text-white/50",
    socialButtonsBlockButtonText: "text-white font-medium",
    formFieldLabel: "text-white/70 font-medium",
    footerActionLink: "text-[#F26B21] font-semibold",
    footerActionText: "text-white/40",
    dividerText: "text-white/30",
    identityPreviewEditButton: "text-[#F26B21]",
    formFieldSuccessText: "text-emerald-400",
    alertText: "text-white/80",
    logoBox: "flex justify-center py-2",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton: "border-white/15 bg-white/5 text-white",
    formButtonPrimary: "bg-[#F26B21] text-white font-bold",
    formFieldInput: "bg-[#252840] border-white/15 text-white",
    footerAction: "bg-[#151829]",
    dividerLine: "bg-white/10",
    alert: "bg-red-500/10 border-red-500/20",
    otpCodeFieldInput: "bg-[#252840] border-white/15 text-white",
    formFieldRow: "gap-3",
    main: "px-8 py-6",
  },
};

// ─── Clerk cache invalidator ──────────────────────────────────────────────────

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

// ─── Sign-in / sign-up pages ─────────────────────────────────────────────────

function SignInPage() {
  const { isSignedIn } = useAuth();
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0D0F1C] px-4">
      <div className="w-full max-w-[440px]">
        <ClerkLoading><div role="status" className="rounded-xl bg-[#1A1D2E] p-8 text-center text-white"><h1 className="text-xl font-bold">Bazunk sign in</h1><p className="mt-3 text-white/70">Connecting to secure sign in…</p><p className="mt-4 text-sm text-white/60">If this stays visible, the authentication service may be unavailable.</p></div></ClerkLoading>
        <ClerkLoaded>
          <div className="mb-4 text-center text-white"><h1 className="text-2xl font-bold">Sign in to Bazunk</h1><p className="mt-2 text-sm text-white/60">Secure account access</p></div>
          <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
        </ClerkLoaded>
      </div>
    </div>
  );
}

function SignUpPage() {
  const { isSignedIn } = useAuth();
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0D0F1C] px-4">
      <div className="w-full max-w-[440px]">
        <ClerkLoading><div role="status" className="rounded-xl bg-[#1A1D2E] p-8 text-center text-white">Connecting to secure sign up…</div></ClerkLoading>
        <ClerkLoaded>
          <div className="mb-4 text-center text-white"><h1 className="text-2xl font-bold">Create your Bazunk account</h1></div>
          <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
        </ClerkLoaded>
      </div>
    </div>
  );
}

// ─── Homepage ─────────────────────────────────────────────────────────────────

function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <IntroSplash />
      <AnnouncementBanner />
      <Navbar />
      <PerksStrip />
      <main className="flex-1">
        <Hero />
        <HomepagePromoCards />
        <CategorySection />
        <FeaturedListings mode="recent" />
        <FeaturedListings mode="promoted" />
        <FeatureVisible feature="live"><LiveNowStrip /></FeatureVisible>
        <FeaturedFeatures />
        <RewardsTeaser />
        <AdSlot slotKey="home_bottom" />
      </main>
      <Footer />
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      {/* Auth — REQUIRED: use /*? wildcard verbatim for OAuth callbacks */}
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-in/*" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />
      <Route path="/sign-up/*" component={SignUpPage} />
      {/* Legacy redirects */}
      <Route path="/login">{() => <Redirect to="/sign-in" />}</Route>
      <Route path="/register">{() => <Redirect to="/sign-up" />}</Route>
      <Route path="/categories" component={CategoriesPage} />
      <Route path="/sell" component={SellPage} />
      <Route path="/sell/snap">{() => <FeatureGate feature="snap_sell" name="Snap & Sell"><SnapSellPage /></FeatureGate>}</Route>
      <Route path="/sell/direct">{() => <FeatureGate feature="quick_sell" name="Direct Sale"><DirectSalePage /></FeatureGate>}</Route>
      <Route path="/sell/quick">{() => <FeatureGate feature="quick_sell" name="Quick Sale"><DirectSalePage /></FeatureGate>}</Route>
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/my-store/settings">{() => <MyStorePage settingsPage />}</Route>
      <Route path="/my-store">{() => <MyStorePage />}</Route>
      <Route path="/importers/:source">{() => <FeatureGate feature="importers" name="Importers"><ImporterWorkspacePage /></FeatureGate>}</Route>
      <Route path="/importers">{() => <FeatureGate feature="importers" name="Importers"><ImportersPage /></FeatureGate>}</Route>
      <Route path="/browse" component={BrowsePage} />
      <Route path="/search" component={BrowsePage} />
      <Route path="/listing/:id" component={ListingPage} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/bundle">{() => <FeatureGate feature="bundles" name="Bundles"><BundlePage /></FeatureGate>}</Route>
      <Route path="/classifieds">{() => <FeatureGate feature="classifieds" name="Classifieds"><ClassifiedsPage /></FeatureGate>}</Route>
      <Route path="/messages">{() => <FeatureGate feature="messaging" name="Messaging"><MessagesPage /></FeatureGate>}</Route>
      <Route path="/seller/:id" component={SellerProfilePage} />
      <Route path="/credits">{() => <FeatureGate feature="credits" name="Credits"><CreditsPage /></FeatureGate>}</Route>
      <Route path="/promotions">{() => <FeatureGate feature="promotions" name="Promotions"><PromotionsPage /></FeatureGate>}</Route>
      <Route path="/support" component={SupportPage} />
      <Route path="/faq">{() => <Redirect to="/support" />}</Route>
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/offers">{() => <FeatureGate feature="offers" name="Make an Offer"><OffersPage /></FeatureGate>}</Route>
      <Route path="/live">{() => <FeatureGate feature="live" name="Live selling"><LiveHubPage /></FeatureGate>}</Route>
      <Route path="/live/:id">{() => <FeatureGate feature="live" name="Live selling"><LivePage /></FeatureGate>}</Route>
      <Route path="/admin" component={AdminLoginPage} />
      <Route path="/admin/demo-creator" component={AdminDemoCreatorPage} />
      <Route path="/admin/dashboard" component={AdminDashboardPage} />
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route path="/admin/seller-compliance" component={AdminSellerCompliancePage} />
      <Route path="/seller-compliance" component={SellerCompliancePage} />
      <Route path="/admin/audit-log" component={AdminAuditLogPage} />
      <Route path="/admin/system-status" component={AdminSystemStatusPage} />
      <Route path="/admin/snap-sell" component={AdminSnapSellPage} />
      <Route path="/admin/feature-toggles" component={AdminFeatureFlagsPage} />
      <Route path="/admin/feature-flags">{() => { window.location.replace("/admin/feature-toggles"); return null; }}</Route>
      <Route path="/admin/products" component={AdminProductsPage} />
      <Route path="/admin/listings" component={AdminListingsPage} />
      <Route path="/admin/imports" component={AdminImportsPage} />
      <Route path="/admin/importer-control" component={AdminImporterControlPage} />
      <Route path="/admin/api-centre" component={AdminImporterControlPage} />
      <Route path="/admin/cashback" component={AdminCashbackPage} />
      <Route path="/admin/classifieds" component={AdminClassifiedsPage} />
      <Route path="/admin/payments" component={AdminPaymentsPage} />
      <Route path="/admin/orders" component={AdminOrdersPage} />
      <Route path="/admin/disputes" component={AdminDisputesPage} />
      <Route path="/admin/returns" component={AdminReturnsPage} />
      <Route path="/admin/auctions" component={AdminAuctionsPage} />
      <Route path="/admin/settings" component={AdminSettingsPage} />
      <Route path="/admin/emails" component={AdminEmailsPage} />
      <Route path="/auctions/create">{() => <FeatureGate feature="auctions" name="Auctions"><CreateAuctionPage /></FeatureGate>}</Route>
      <Route path="/auctions/:id">{() => <FeatureGate feature="auctions" name="Auctions"><AuctionDetailPage /></FeatureGate>}</Route>
      <Route path="/auctions">{() => <FeatureGate feature="auctions" name="Auctions"><AuctionsPage /></FeatureGate>}</Route>
      <Route path="/flash-sales/create">{() => <FeatureGate feature="flash_sales" name="Flash Sales"><CreateFlashSalePage /></FeatureGate>}</Route>
      <Route path="/flash-sales/:id">{() => <FeatureGate feature="flash_sales" name="Flash Sales"><FlashSaleDetailPage /></FeatureGate>}</Route>
      <Route path="/flash-sales">{() => <FeatureGate feature="flash_sales" name="Flash Sales"><FlashSalesPage /></FeatureGate>}</Route>
      <Route path="/admin/flash-sales" component={AdminFlashSalesPage} />
      <Route path="/admin/support" component={AdminSupportPage} />
      <Route path="/admin/chatwoot" component={AdminChatwootSettingsPage} />
      <Route path="/admin/rewards" component={AdminRewardsPage} />
      <Route path="/admin/credits-economy" component={AdminCreditsEconomyPage} />
      <Route path="/admin/referrals" component={AdminReferralsPage} />
      <Route path="/admin/promotions" component={AdminPromotionsPage} />
      <Route path="/admin/reviews" component={AdminReviewsPage} />
      <Route path="/admin/verification" component={AdminVerificationPage} />
      <Route path="/setup" component={SetupWizardPage} />
      <Route path="/videos" component={VideoPage} />
      <Route path="/video">{() => <Redirect to="/videos" />}</Route>
      <Route path="/rewards/referrals">{() => <FeatureGate feature="referrals" name="Referrals"><ReferralsPage /></FeatureGate>}</Route>
      <Route path="/rewards">{() => <FeatureGate feature="games" name="Rewards Arcade"><RewardsPage /></FeatureGate>}</Route>
      <Route path="/treasure-hunt">{() => <Redirect to="/rewards" />}</Route>
      <Route path="/buyer-protection">{() => <FeatureGate feature="buyer_protection" name="Buyer Protection"><BuyerProtectionPage /></FeatureGate>}</Route>
      <Route path="/cashback">{() => <FeatureGate feature="cashback" name="Cashback"><CashbackPage /></FeatureGate>}</Route>
      <Route path="/welcome-new-buyers" component={WelcomeNewBuyers} />
      <Route component={NotFound} />
    </Switch>
  );
}

// ─── Inner app (inside ClerkProvider + WouterRouter) ────────────────────────

function InnerApp() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back", subtitle: "Sign in to your Bazunk account" } },
        signUp: { start: { title: "Create your account", subtitle: "Join the UK's peer-to-peer marketplace" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <AuthProvider>
          <UserCurrencySync />
            <CartProvider>
              <WatchlistProvider>
                <LiveStreamProvider>
                  <OfferProvider>
                    <ScrollToTop />
                    <BackToTop />
                    <Router />
                    <CartDrawer />
                    <ChatwootWidget />
                    <Toaster />
                  </OfferProvider>
                </LiveStreamProvider>
              </WatchlistProvider>
            </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

// ─── Root app ─────────────────────────────────────────────────────────────────

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="bazunk-theme" disableTransitionOnChange={false}>
    <TooltipProvider>
      <CurrencyProvider>
        <LanguageProvider>
        <SiteSettingsProvider>
          <AdminProvider>
            <WouterRouter base={basePath}>
              <InnerApp />
            </WouterRouter>
          </AdminProvider>
        </SiteSettingsProvider>
        </LanguageProvider>
      </CurrencyProvider>
    </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
