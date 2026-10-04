import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  Lock,
  Unlock,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Search,
  Sparkles,
  ShoppingBag,
  RefreshCw,
  X,
  FileCheck,
} from 'lucide-react';

interface PublicApp {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  priceTZS: number;
  version?: string;
  size?: string;
  category?: string;
  createdAt: number;
}

interface PremiumAppsPageProps {
  onBackToChat: () => void;
  showToast: (msg: string) => void;
}

export const PremiumAppsPage: React.FC<PremiumAppsPageProps> = ({ onBackToChat, showToast }) => {
  const [apps, setApps] = useState<PublicApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unlocked'>('all');

  // Unlocked apps tracking in state and localStorage
  const [unlockedAppIds, setUnlockedAppIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nadhili_unlocked_apps');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // App download links storage (once verified, cached locally for convenience)
  const [unlockedDownloadLinks, setUnlockedDownloadLinks] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('nadhili_download_links');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Purchase Modal State
  const [selectedAppForPurchase, setSelectedAppForPurchase] = useState<PublicApp | null>(null);
  const [phone, setPhone] = useState('');
  const [network, setNetwork] = useState<'mpesa' | 'tigo' | 'airtel' | 'halopesa'>('mpesa');
  const [purchaseStatus, setPurchaseStatus] = useState<'idle' | 'push_sent' | 'success' | 'failed'>('idle');
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [diagnosticMessage, setDiagnosticMessage] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Fetch apps
  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/apps');
      if (res.ok) {
        const data = await res.json();
        setApps(data.apps || []);
      }
    } catch (err) {
      console.error('Failed to fetch apps:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  // Countdown timer when push is sent
  useEffect(() => {
    let timer: any;
    if (purchaseStatus === 'push_sent' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [purchaseStatus, countdown]);

  const handleInitiatePurchase = async () => {
    if (!selectedAppForPurchase) return;
    const clean = phone.trim().replace(/[^0-9]/g, '');
    if (!clean) {
      showToast('Tafadhali ingiza nambari yako ya simu ya malipo.');
      return;
    }

    setPurchasing(true);
    setPurchaseStatus('idle');
    setStatusMessage('');

    try {
      const res = await fetch('/api/apps/purchase/initiate-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: selectedAppForPurchase.id,
          phoneNumber: clean,
          network,
        }),
      });

      const raw = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(raw);
      } catch {
        data = { error: 'Hitilafu ya mtandao wa malipo. Tafadhali jaribu tena.' };
      }

      if (!res.ok || data.success === false) {
        setDiagnosticMessage(data.diagnostic || '');
        if (data.orderReference) setOrderRef(data.orderReference);
        throw new Error(data.error || 'Haikuweza kuanzisha malipo ya simu');
      }

      setOrderRef(data.orderReference);
      setPurchaseStatus('push_sent');
      setCountdown(60);
      setStatusMessage(data.message || 'Ombi la malipo limetumwa kwenye simu yako! Tafadhali weka PIN.');
      showToast('Ombi la malipo limetumwa kwenye simu!');

      // Start status polling
      startPollingPaymentStatus(data.orderReference, selectedAppForPurchase.id);
    } catch (err: any) {
      setPurchaseStatus('failed');
      setStatusMessage(err.message || 'Hitilafu ya kuanzisha USSD Push');
      showToast(err.message || 'Hitilafu ya malipo');
    } finally {
      setPurchasing(false);
    }
  };

  const startPollingPaymentStatus = (ref: string, appId: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 30) {
        clearInterval(interval);
        return;
      }

      try {
        const res = await fetch(`/api/apps/purchase/status/${ref}`);
        if (res.ok) {
          const raw = await res.text();
          let data: any = {};
          try {
            data = JSON.parse(raw);
          } catch {}

          if (data.status === 'SUCCESS') {
            clearInterval(interval);
            unlockAppLocally(appId, ref, data.downloadUrl);
          } else if (data.status === 'FAILED') {
            clearInterval(interval);
            setPurchaseStatus('failed');
            setStatusMessage('Malipo yameshindikana au mtumiaji ameghairi kwenye simu.');
          }
        }
      } catch {}
    }, 2500);
  };

  // Manual verify button if user already entered PIN on phone
  const handleVerifyManually = async () => {
    if (!orderRef || !selectedAppForPurchase) return;
    setPurchasing(true);
    try {
      const res = await fetch(`/api/apps/purchase/verify/${orderRef}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: selectedAppForPurchase.id }),
      });
      const data = await res.json();
      if (data.status === 'SUCCESS' || data.success) {
        unlockAppLocally(selectedAppForPurchase.id, orderRef, data.downloadUrl);
      } else {
        showToast('Bado malipo hayajathibitishwa. Tafadhali hakikisha umeingiza PIN kwenye simu.');
      }
    } catch {
      showToast('Hitilafu ya kuthibitisha malipo.');
    } finally {
      setPurchasing(false);
    }
  };

  const unlockAppLocally = (appId: string, ref: string, directUrl?: string) => {
    setPurchaseStatus('success');
    setStatusMessage('Hongera! Malipo yamethibitishwa na link ya kupakua app imefunguliwa!');
    showToast('App imefunguliwa kikamilifu!');

    // Update unlocked array
    const updatedUnlocked = Array.from(new Set([...unlockedAppIds, appId]));
    setUnlockedAppIds(updatedUnlocked);
    localStorage.setItem('nadhili_unlocked_apps', JSON.stringify(updatedUnlocked));

    // If direct link provided, cache it
    if (directUrl) {
      const updatedLinks = { ...unlockedDownloadLinks, [appId]: directUrl };
      setUnlockedDownloadLinks(updatedLinks);
      localStorage.setItem('nadhili_download_links', JSON.stringify(updatedLinks));
    }
  };

  // Download action
  const handleDownloadApp = async (appId: string, appName: string) => {
    // Check if we have cached link
    const cachedLink = unlockedDownloadLinks[appId];
    if (cachedLink) {
      triggerDownload(cachedLink, `${appName.toLowerCase().replace(/\s+/g, '-')}.apk`);
      return;
    }

    // Retrieve secret link from server for unlocked app
    try {
      const res = await fetch(`/api/apps/${appId}/download-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderRef: orderRef || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.downloadUrl) {
        showToast(data.error || 'Link hii haijafunguliwa. Tafadhali kamilisha malipo kwanza.');
        return;
      }

      // Cache it
      setUnlockedDownloadLinks((prev) => {
        const up = { ...prev, [appId]: data.downloadUrl };
        localStorage.setItem('nadhili_download_links', JSON.stringify(up));
        return up;
      });

      triggerDownload(data.downloadUrl, `${appName.toLowerCase().replace(/\s+/g, '-')}.apk`);
      showToast('Upakuaji wa app umeanza!');
    } catch (err: any) {
      showToast(err.message || 'Hitilafu ya kupakua app');
    }
  };

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Filter apps
  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.description.toLowerCase().includes(search.toLowerCase()) ||
      (app.category || '').toLowerCase().includes(search.toLowerCase());

    if (filter === 'unlocked') {
      return matchesSearch && unlockedAppIds.includes(app.id);
    }
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#10100f] text-[#ede8dd] font-sans selection:bg-[#da7756]/30">
      {/* Top Navbar */}
      <header className="h-16 border-b border-[#242421] bg-[#141413]/90 backdrop-blur sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToChat}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-xl bg-[#1c1c1a] border border-[#2b2b28] hover:border-[#da7756]/50 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#da7756]" />
            <span>Rudi Chat</span>
          </button>
          <div className="h-5 w-[1px] bg-[#292926]" />
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.svg"
              alt="NADHILI AI"
              className="w-8 h-8 rounded-xl object-contain shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-bold text-white tracking-wide">NADHILI App Store</h1>
                <span className="text-[9px] bg-[#da7756]/20 text-[#da7756] border border-[#da7756]/30 px-2 py-0.2 rounded-full font-mono uppercase font-semibold">
                  Premium
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter(filter === 'all' ? 'unlocked' : 'all')}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
              filter === 'unlocked'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-[#1a1a18] text-neutral-300 border-[#2b2b28] hover:border-[#da7756]/40'
            }`}
          >
            <Unlock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Nilizonunua ({unlockedAppIds.length})</span>
          </button>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="border-b border-[#242421] bg-gradient-to-b from-[#181815] to-[#10100f] py-10 px-4 sm:px-8 text-center relative overflow-hidden">
        <div className="max-w-2xl mx-auto space-y-3 relative z-10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#da7756]/15 border border-[#da7756]/30 flex items-center justify-center p-2 shadow-xl">
            <img
              src="/logo.svg"
              alt="NADHILI"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Programu za Kisasa za Premium (Apps)
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed">
            Chagua app unayoitaka, lipia kiasi chake kidogo kupitia namba yako ya simu (USSD Push), na link ya kupakua app hiyo itafunguka mara moja.
          </p>

          {/* Search Box */}
          <div className="pt-2 max-w-md mx-auto relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tafuta app kwa jina au maelezo..."
              className="w-full bg-[#181816] border border-[#2d2d29] focus:border-[#da7756] focus:outline-none rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 shadow-xl transition"
            />
          </div>
        </div>
      </div>

      {/* Main Apps Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        {loading ? (
          <div className="py-20 text-center text-neutral-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#da7756]" />
            <p className="text-xs">Inapakia programu...</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="py-20 text-center text-neutral-500 space-y-2">
            <ShoppingBag className="w-10 h-10 mx-auto text-neutral-600" />
            <p className="text-sm font-semibold text-neutral-400">Hakuna app iliyopatikana.</p>
            <p className="text-xs text-neutral-600">
              {filter === 'unlocked' ? 'Bado haujanunua app yoyote.' : 'Tafadhali badili neno la utafutaji.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApps.map((app) => {
              const isUnlocked = unlockedAppIds.includes(app.id);

              return (
                <div
                  key={app.id}
                  className="bg-[#181816] border border-[#2a2a27] hover:border-[#da7756]/40 rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 shadow-xl hover:shadow-[0_0_20px_rgba(218,119,86,0.1)] group"
                >
                  <div className="space-y-4">
                    {/* Top Row: Icon & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-[#22221f] border border-[#33332f] overflow-hidden p-1.5 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                        <img
                          src={app.imageUrl || '/logo.svg'}
                          alt={app.name}
                          className="w-full h-full object-cover rounded-xl"
                          onError={(e) => {
                            (e.target as any).src = '/logo.svg';
                          }}
                        />
                      </div>

                      <div className="text-right">
                        {isUnlocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <Unlock className="w-3 h-3" />
                            Imefunguliwa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase bg-[#da7756]/15 text-[#da7756] border border-[#da7756]/30">
                            <Lock className="w-3 h-3" />
                            Imebana
                          </span>
                        )}
                        <p className="text-base font-extrabold text-white mt-1">
                          TZS {app.priceTZS.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* App Title & Metadata */}
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-[#da7756] transition-colors">
                        {app.name}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono mt-1">
                        {app.version && <span>{app.version}</span>}
                        {app.version && app.size && <span>•</span>}
                        {app.size && <span>{app.size}</span>}
                        {app.category && <span>• {app.category}</span>}
                      </div>
                      <p className="text-xs text-neutral-300 mt-2 leading-relaxed line-clamp-3">
                        {app.description}
                      </p>
                    </div>
                  </div>

                  {/* Action Area */}
                  <div className="pt-4 border-t border-[#262623] mt-5">
                    {isUnlocked ? (
                      <button
                        onClick={() => handleDownloadApp(app.id, app.name)}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                        <span>Pakua App Sasa (Direct Download)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedAppForPurchase(app);
                          setPurchaseStatus('idle');
                          setStatusMessage('');
                          setOrderRef(null);
                        }}
                        className="w-full py-2.5 bg-gradient-to-r from-[#da7756] to-[#eb947a] hover:from-[#e38161] hover:to-[#f09f87] text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Lipia TZS {app.priceTZS.toLocaleString()} (Fungua App)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* --- APP PURCHASE MODAL VIA USSD PUSH --- */}
      {selectedAppForPurchase && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#1b1b19] border border-[#33332f] rounded-3xl max-w-md w-full p-6 text-neutral-200 relative shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#2b2b27]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#242421] border border-[#363632] overflow-hidden p-1 flex items-center justify-center shrink-0">
                  <img
                    src={selectedAppForPurchase.imageUrl || '/logo.svg'}
                    alt={selectedAppForPurchase.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white truncate max-w-[220px]">
                    {selectedAppForPurchase.name}
                  </h3>
                  <p className="text-[11px] text-[#da7756] font-bold">
                    Kiasi: TZS {selectedAppForPurchase.priceTZS.toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppForPurchase(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-[#282824]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If Payment Succeeded */}
            {purchaseStatus === 'success' ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Malipo Yamethibitishwa!</h4>
                  <p className="text-xs text-neutral-300 mt-1">
                    Hongera! Link ya kupakua <strong>{selectedAppForPurchase.name}</strong> imefunguliwa.
                  </p>
                </div>

                <button
                  onClick={() => {
                    handleDownloadApp(selectedAppForPurchase.id, selectedAppForPurchase.name);
                    setSelectedAppForPurchase(null);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-bold rounded-xl shadow-xl transition flex items-center justify-center gap-2 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Pakua App Sasa (Download)</span>
                </button>
              </div>
            ) : (
              /* Payment Form */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Nambari ya Simu ya Malipo (Tanzania):
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Mfano: 0712 345 678 au 0754 000 000"
                    disabled={purchaseStatus === 'push_sent' && countdown > 0}
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none transition font-mono tracking-wider"
                  />
                </div>

                {/* Mobile Money Provider Pills */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Chagua Mtandao wa Malipo:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'mpesa', name: 'M-Pesa' },
                      { id: 'tigo', name: 'Tigo Pesa' },
                      { id: 'airtel', name: 'Airtel' },
                      { id: 'halopesa', name: 'HaloPesa' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setNetwork(m.id as any)}
                        className={`py-2 text-[11px] font-bold rounded-xl border transition ${
                          network === m.id
                            ? 'bg-[#da7756] text-white border-[#da7756] shadow-sm'
                            : 'bg-[#181816] text-neutral-400 border-[#2a2a27] hover:text-white'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status or instruction box */}
                {purchaseStatus === 'push_sent' && (
                  <div className="p-4 rounded-2xl bg-[#22221f] border border-amber-500/30 space-y-2 text-center">
                    <p className="text-xs font-semibold text-amber-300 flex items-center justify-center gap-1.5">
                      <Smartphone className="w-4 h-4 animate-bounce text-[#da7756]" />
                      <span>Angalia simu yako sasa na uingize PIN ya malipo!</span>
                    </p>
                    <p className="text-[11px] text-neutral-400 font-mono">
                      Muda uliobaki: {countdown}s
                    </p>
                    {orderRef && (
                      <p className="text-[10px] text-neutral-500 font-mono">Ref: {orderRef}</p>
                    )}
                  </div>
                )}

                {purchaseStatus === 'failed' && (
                  <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 space-y-3 text-left">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <h4 className="text-xs font-bold text-white">Kwanini Malipo Hayajaja Kwenye Simu?</h4>
                    </div>

                    <div className="bg-black/40 border border-red-900/50 rounded-xl p-3 text-xs text-red-200 leading-relaxed space-y-1">
                      <p className="font-semibold text-white">Sababu:</p>
                      <p className="text-red-300">{statusMessage || 'Hitilafu ya kuunganisha na mtandao wa malipo.'}</p>
                      {diagnosticMessage && (
                        <div className="pt-2 border-t border-red-900/40 text-[11px] text-neutral-300">
                          <span className="font-semibold text-amber-400">Ufafanuzi: </span>
                          {diagnosticMessage}
                        </div>
                      )}
                    </div>

                    <div className="bg-[#1e1e1a] border border-[#33332e] rounded-xl p-2.5 text-[11px] text-neutral-300 space-y-1">
                      <p className="font-semibold text-neutral-200">Mambo ya kuzingatia:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-neutral-400 text-[10px]">
                        <li>Hakikisha nambari ya simu ({phone || '07XXXXXXXX'}) ipo hewani.</li>
                        <li>Funguo za ClickPesa zinapaswa kusanidiwa kwenye Admin Panel.</li>
                        <li>Unaweza pia kufungua app moja kwa moja kwa hali ya jaribio hapa chini:</li>
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        unlockAppLocally(selectedAppForPurchase.id, orderRef || 'sim_' + Date.now());
                        showToast(`App ya ${selectedAppForPurchase.name} imefunguliwa kwa mafanikio!`);
                      }}
                      className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shadow"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Fungua App Papo Hapo (Simulate / Jaribio)</span>
                    </button>
                  </div>
                )}

                {/* Primary Button */}
                {purchaseStatus !== 'push_sent' ? (
                  <button
                    onClick={handleInitiatePurchase}
                    disabled={purchasing}
                    className="w-full py-3 bg-gradient-to-r from-[#da7756] to-[#eb947a] hover:from-[#e38161] hover:to-[#f09f87] text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>
                      {purchasing ? 'Inatuma ombi la USSD...' : `Lipa TZS ${selectedAppForPurchase.priceTZS.toLocaleString()}`}
                    </span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={handleVerifyManually}
                      disabled={purchasing}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{purchasing ? 'Inakagua...' : 'Nimekwisha Weka PIN (Thibitisha Malipo)'}</span>
                    </button>
                    <button
                      onClick={handleInitiatePurchase}
                      disabled={purchasing}
                      className="w-full py-2 bg-[#22221f] hover:bg-[#2b2b27] text-neutral-300 text-xs font-medium rounded-xl transition"
                    >
                      Tuma Ombi Tena
                    </button>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between text-[10px] text-neutral-500 border-t border-[#262623]">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Malipo Salama ya Simu
                  </span>
                  <span>App Moja tu Itafunguliwa</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
