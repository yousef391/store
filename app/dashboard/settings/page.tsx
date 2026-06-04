"use client";

import { useState, useEffect } from "react";
import { Save, DollarSign, Truck, Check, Lock } from "lucide-react";
import { zonePrices as defaultZones, zoneLabels } from "@/data/wilayas";
import { fetchStoreSettings, updateStoreSettings } from "@/lib/api";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [singlePrice, setSinglePrice] = useState(5400);
  const [bundlePrice, setBundlePrice] = useState(8200);
  const [fbPixelId, setFbPixelId] = useState("");
  const [zones, setZones] = useState<Record<number, number>>(defaultZones);

  // Telegram
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");

  // Meta CAPI
  const [metaPixelId, setMetaPixelId] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");

  // Yalidine
  const [yalidineApiId, setYalidineApiId] = useState("");
  const [yalidineApiToken, setYalidineApiToken] = useState("");

  // Admin Password
  const [adminPassword, setAdminPassword] = useState("");

  useEffect(() => {
    fetchStoreSettings().then((data) => {
      if (data) {
        setSinglePrice(data.single_price || 5400);
        setBundlePrice(data.bundle_price || 8200);
        setFbPixelId(data.fb_pixel_id || "");
        setZones(data.zone_prices || defaultZones);
        setTelegramToken(data.telegram_bot_token || "");
        setTelegramChatId(data.telegram_chat_id || "");
        setMetaPixelId(data.meta_pixel_id || "");
        setMetaAccessToken(data.meta_access_token || "");
        setYalidineApiId(data.yalidine_api_id || "");
        setYalidineApiToken(data.yalidine_api_token || "");
        setAdminPassword(data.admin_password || "");
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateStoreSettings({
        single_price: singlePrice,
        bundle_price: bundlePrice,
        fb_pixel_id: fbPixelId,
        zone_prices: zones,
        telegram_bot_token: telegramToken,
        telegram_chat_id: telegramChatId,
        meta_pixel_id: metaPixelId,
        meta_access_token: metaAccessToken,
        yalidine_api_id: yalidineApiId,
        yalidine_api_token: yalidineApiToken,
        admin_password: adminPassword,
      });
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white font-heading">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage pricing, notifications, and integrations.</p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Product Pricing */}
        <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                <DollarSign size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white font-heading">Product Pricing</h3>
                <p className="text-gray-500 text-sm">Default prices shown on the storefront.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-400">Single Piece Price</label>
                <div className="relative">
                  <input type="number" value={singlePrice} onChange={(e) => setSinglePrice(parseInt(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-14 py-3 text-white text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">DA</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-400">Bundle Price (2 Pieces)</label>
                <div className="relative">
                  <input type="number" value={bundlePrice} onChange={(e) => setBundlePrice(parseInt(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-14 py-3 text-white text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">DA</span>
                </div>
                <span className="text-xs text-gray-400">Savings: <strong className="text-emerald-400">{((singlePrice * 2) - bundlePrice).toLocaleString()} DA</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Zone Pricing */}
        <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-400">
                <Truck size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white font-heading">Delivery Pricing by Zone</h3>
                <p className="text-gray-500 text-sm">Set delivery fees per zone.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(zoneLabels).map(([zoneId, label]) => (
                <div key={zoneId} className="flex flex-col gap-1.5 bg-white/5 rounded-xl p-4">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider leading-tight">Zone {zoneId} — {label}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={zones[parseInt(zoneId)] || 0}
                      onChange={(e) => setZones({ ...zones, [parseInt(zoneId)]: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-12 py-2 text-white text-sm font-mono font-bold focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">DA</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Telegram Notifications */}
        <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-sky-500" />
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              </div>
              <div>
                <h3 className="font-bold text-lg text-white font-heading">Telegram Notifications</h3>
                <p className="text-gray-500 text-sm">Receive order alerts on Telegram.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-400">Bot Token</label>
                <input type="text" value={telegramToken} onChange={(e) => setTelegramToken(e.target.value)} placeholder="7665219648:AAF..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-4 py-3 text-white text-sm font-mono focus:ring-2 focus:ring-sky-500 outline-none placeholder:text-gray-600" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-400">Chat ID</label>
                <input type="text" value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} placeholder="5543481055"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-4 py-3 text-white text-sm font-mono focus:ring-2 focus:ring-sky-500 outline-none placeholder:text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Meta CAPI / Facebook Pixel */}
        <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </div>
              <div>
                <h3 className="font-bold text-lg text-white font-heading">Meta Conversions API</h3>
                <p className="text-gray-500 text-sm">Server-side tracking for ad optimization.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-400">Pixel ID</label>
                <input type="text" value={metaPixelId} onChange={(e) => setMetaPixelId(e.target.value)} placeholder="2133839294033756"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-4 py-3 text-white text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-gray-600" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-400">Access Token</label>
                <input type="password" value={metaAccessToken} onChange={(e) => setMetaAccessToken(e.target.value)} placeholder="EAAKTs7EQ6..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-4 py-3 text-white text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-gray-600" />
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <label className="text-sm font-bold text-gray-400">Browser Pixel ID <span className="text-gray-600 font-normal">(legacy)</span></label>
              <input type="text" value={fbPixelId} onChange={(e) => setFbPixelId(e.target.value)} placeholder="Enter your Facebook Pixel ID"
                className="w-full max-w-md bg-white/5 border border-white/10 rounded-xl pl-4 pr-4 py-3 text-white text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-gray-600" />
            </div>
          </div>
        </div>

        {/* Yalidine Shipping */}
        <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-lg text-white font-heading">Yalidine Shipping</h3>
                <p className="text-gray-500 text-sm">API credentials for parcel dispatch.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-400">API ID</label>
                <input type="text" value={yalidineApiId} onChange={(e) => setYalidineApiId(e.target.value)} placeholder="26237534515339637272"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-4 py-3 text-white text-sm font-mono focus:ring-2 focus:ring-rose-500 outline-none placeholder:text-gray-600" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-400">API Token</label>
                <input type="password" value={yalidineApiToken} onChange={(e) => setYalidineApiToken(e.target.value)} placeholder="8qh59J0iEao..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-4 py-3 text-white text-sm font-mono focus:ring-2 focus:ring-rose-500 outline-none placeholder:text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Admin Password */}
        <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-gray-500" />
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gray-500/10 rounded-xl flex items-center justify-center text-gray-400">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white font-heading">Admin Password</h3>
                <p className="text-gray-500 text-sm">Change your dashboard login password.</p>
              </div>
            </div>
            <div className="max-w-md flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-400">Password</label>
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Enter new password"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-4 py-3 text-white text-sm font-mono focus:ring-2 focus:ring-gray-500 outline-none placeholder:text-gray-600" />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="text-sm text-emerald-400 font-semibold flex items-center gap-1.5"><Check size={16} /> Settings saved to database</span>
          )}
          <button type="submit" disabled={isSaving}
            className="bg-accent hover:bg-accent-hover text-black px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-75 shadow-lg shadow-accent/20 active:scale-[0.97]">
            {isSaving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Saving...
              </span>
            ) : (
              <><Save size={18} /> Save Changes</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
