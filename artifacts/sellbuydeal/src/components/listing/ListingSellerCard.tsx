import { useEffect, useState } from "react";
import { useLocation as useWouter } from "wouter";
import { Users, MapPin, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { SellerProfileCard } from "@/components/SellerProfileCard";
function FollowSellerButton({ sellerEmail }: { sellerEmail: string }) {
  const { user } = useAuth();
  const [, navigate] = useWouter();
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams({ sellerEmail });
    if (user?.email) q.set("followerEmail", user.email);
    fetch(`/api/follows/status?${q}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) { setFollowing(!!d.following); setFollowers(d.followers ?? 0); } })
      .catch(() => {});
  }, [sellerEmail, user?.email]);

  if (user?.email && user.email.toLowerCase() === sellerEmail.toLowerCase()) {
    return <p className="text-sm text-slate-600 dark:text-slate-200">{followers} follower{followers === 1 ? "" : "s"}</p>;
  }

  async function toggle() {
    if (!user?.email) { navigate("/sign-in"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/follows", {
        method: following ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerEmail: user.email, sellerEmail }),
      });
      if (r.ok) { const d = await r.json(); setFollowing(!!d.following); setFollowers(d.followers ?? 0); }
    } finally { setBusy(false); }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-slate-600 dark:text-slate-200">{followers} follower{followers === 1 ? "" : "s"}</p>
      <button
        onClick={toggle}
        disabled={busy}
        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors disabled:opacity-50 ${
          following ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-[#4A5CE8] text-white hover:opacity-90"
        }`}
      >
        {following ? "Following" : "Follow seller"}
      </button>
    </div>
  );
}

export function SellerCard({ sellerName, sellerUsername, sellerEmail, location, verified }: { sellerName: string; sellerUsername?: string; sellerEmail?: string; location: string; verified: boolean }) {
  const initial = sellerName.charAt(0).toUpperCase();
  return (
    <div className="bg-white dark:bg-[#111f36] rounded-2xl border border-violet-200 dark:border-violet-800 shadow-sm p-5 min-w-0">
      <div className="-mx-5 -mt-5 mb-5 rounded-t-2xl bg-gradient-to-r from-[#4A5CE8] to-[#7C3AED] px-5 py-4 text-white">
        <h3 className="text-sm font-bold flex items-center gap-2"><Users className="w-4 h-4" /> Meet the seller</h3>
        <p className="mt-1 text-sm text-white">Profile, reviews and seller updates</p>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4A5CE8] to-[#7C3AED] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {initial}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-slate-900 dark:text-white text-sm">{sellerUsername ? `@${sellerUsername}` : sellerName}</p>
            {verified && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          </div>
          <p className="text-sm text-slate-600 mt-0.5">{verified ? "Identity verified" : "Bazunk seller · verification not shown"}</p>
        </div>
      </div>

      <div className="space-y-2 mb-4 text-sm text-slate-600 dark:text-slate-200 dark:text-slate-200">
        <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-600" />{location}</div>
        {verified && (
          <div className="flex items-center gap-2 text-emerald-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" />ID Verified Seller</div>
        )}
      </div>
      {sellerEmail && <SellerProfileCard sellerEmail={sellerEmail} />}
      {sellerEmail && <div className="mt-4 pt-4 border-t border-gray-100"><FollowSellerButton sellerEmail={sellerEmail} /></div>}
    </div>
  );
}

