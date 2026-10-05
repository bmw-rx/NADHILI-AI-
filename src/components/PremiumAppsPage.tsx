import React, { useState, useEffect, useRef } from 'react';
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
  Share2,
  Copy,
  Check,
  Upload,
  Plus,
  MessageCircle,
  Send,
  Eye,
} from 'lucide-react';
import {
  cleanAppImageUrl,
  getProxiedImageUrl,
  PRESET_APP_ICONS,
  fileToCompressedDataUrl,
} from '../utils/imageHelper';

export interface PublicApp {
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
  initialAppId?: string | null;
}

export const PremiumAppsPage: React.FC<PremiumAppsPageProps> = ({
  onBackToChat,
  showToast,
  initialAppId,
}) => {
  const [apps, setApps] = useState<PublicApp[]>(() => {
    try {
      const cached = localStorage.getItem('nadhili_public_apps_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unlocked'>('all');
  const [highlightedAppId, setHighlightedAppId] = useState<string | null>(null);

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

  // Share Modal State
  const [sharingApp, setSharingApp] = useState<PublicApp | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Submit / Upload New App Modal State (solves app submission & persistence)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadDownloadUrl, setUploadDownloadUrl] = useState('');
  const [uploadImageUrl, setUploadImageUrl] = useState('');
  const [uploadPrice, setUploadPrice] = useState('2500');
  const [uploadVersion, setUploadVersion] = useState('v1.0.0');
  const [uploadSize, setUploadSize] = useState('45 MB');
  const [uploadCategory, setUploadCategory] = useState('AI Tools & Mobile');
  const [uploadDescription, setUploadDescription] = useState('');
  const [submittingApp, setSubmittingApp] = useState(false);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);

  // Fetch apps from server
  const fetchApps = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch('/api/apps');
      if (res.ok) {
        const data = await res.json();
        const serverApps: PublicApp[] = data.apps || [];
        setApps(serverApps);
        try {
          localStorage.setItem('nadhili_public_apps_cache', JSON.stringify(serverApps));
        } catch {}
        if (isManualRefresh) {
          showToast('Orodha ya Apps imesasishwa kikamilifu!');
        }
      }
    } catch (err) {
      console.error('Failed to fetch apps:', err);
      if (isManualRefresh) {
        showToast('Hitilafu ya kusasisha apps');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  // Handle Shared App deep-linking when page loads or URL has ?app=...
  useEffect(() => {
    if (apps.length === 0) return;

    // Check prop or URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const targetId =
      initialAppId ||
      urlParams.get('app') ||
      (window.location.hash.includes('app=')
        ? new URLSearchParams(window.location.hash.split('?')[1] || '').get('app')
        : null);

    if (targetId) {
      const targetApp = apps.find((a) => a.id === targetId);
      if (targetApp) {
        setSelectedAppForPurchase(targetApp);
        setHighlightedAppId(targetApp.id);
        showToast(`Umefungua app ya "${targetApp.name}" uliyotumiwa!`);
        setTimeout(() => {
          const el = document.getElementById(`app-card-${targetApp.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 400);
      }
    }
  }, [apps, initialAppId]);

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

  // Initiate USSD Push Payment
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
    setDiagnosticMessage('');

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

      const data = await res.json();
      if (!res.ok || data.success === false) {
        setDiagnosticMessage(data.diagnostic || '');
        if (data.orderReference) setOrderRef(data.orderReference);
        throw new Error(data.error || 'Haikuweza kuanzisha malipo ya simu');
      }

      setOrderRef(data.orderReference);
      setPurchaseStatus('push_sent');
      setCountdown(60);
      setStatusMessage('Ombi la malipo limetumwa kwenye simu yako! Tafadhali weka PIN kuthibitisha.');
      showToast('Ombi la malipo limetumwa kwenye simu!');

      // Poll status
      startPollingPaymentStatus(data.orderReference, selectedAppForPurchase.id);
    } catch (err: any) {
      setPurchaseStatus('failed');
      setStatusMessage(err.message || 'Hitilafu ya kuanzisha malipo.');
      showToast(err.message || 'Hitilafu ya kuanzisha malipo.');
    } finally {
      setPurchasing(false);
    }
  };

  // Poll for payment success
  const startPollingPaymentStatus = (reference: string, appId: string) => {
    let attempts = 0;
    const maxAttempts = 24; // 2 minutes (every 5 seconds)

    const interval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(interval);
        return;
      }

      try {
        const res = await fetch(`/api/apps/purchase/status/${reference}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === 'SUCCESS') {
          clearInterval(interval);
          setPurchaseStatus('success');
          unlockAppLocally(appId, reference);
          showToast('Malipo yamethibitishwa! App imefunguliwa.');
        } else if (data.status === 'FAILED') {
          clearInterval(interval);
          setPurchaseStatus('failed');
          setStatusMessage('Malipo yameshindikana au yalikataliwa kwenye simu.');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000);
  };

  // Verify payment manually
  const handleVerifyManually = async () => {
    if (!orderRef || !selectedAppForPurchase) return;
    setPurchasing(true);
    try {
      const res = await fetch(`/api/apps/purchase/verify/${orderRef}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPurchaseStatus('success');
        unlockAppLocally(selectedAppForPurchase.id, orderRef, data.downloadUrl);
        showToast('Hongera! Malipo yako yamethibitishwa kikamilifu.');
      } else {
        showToast(data.message || 'Malipo bado hayajathibitishwa na mtandao wa simu.');
      }
    } catch (err: any) {
      showToast(err.message || 'Hitilafu ya kuthibitisha malipo.');
    } finally {
      setPurchasing(false);
    }
  };

  // Unlock app locally
  const unlockAppLocally = (appId: string, reference: string, directUrl?: string) => {
    const updatedUnlocked = Array.from(new Set([...unlockedAppIds, appId]));
    setUnlockedAppIds(updatedUnlocked);
    localStorage.setItem('nadhili_unlocked_apps', JSON.stringify(updatedUnlocked));

    if (directUrl) {
      const updatedLinks = { ...unlockedDownloadLinks, [appId]: directUrl };
      setUnlockedDownloadLinks(updatedLinks);
      localStorage.setItem('nadhili_download_links', JSON.stringify(updatedLinks));
    }
  };

  // Download action
  const handleDownloadApp = async (appId: string, appName: string) => {
    const cachedLink = unlockedDownloadLinks[appId];
    if (cachedLink) {
      triggerDownload(cachedLink, `${appName.toLowerCase().replace(/\s+/g, '-')}.apk`);
      return;
    }

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

  // Share functionality: opens share modal and supports native share & social platforms
  const handleOpenShare = async (app: PublicApp, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const shareUrl = `${window.location.origin}/?app=${encodeURIComponent(app.id)}`;
    const shareTitle = `${app.name} - NADHILI AI Apps`;
    const shareText = `Tazama na upakue app ya "${app.name}" kwenye NADHILI AI Store: ${app.description.slice(0, 100)}...`;

    // Try mobile native share if on mobile device
    if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        showToast('App imeshirikiwa kikamilifu!');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    setSharingApp(app);
    setCopiedLink(false);
  };

  // Copy share link to clipboard
  const handleCopyShareLink = async () => {
    if (!sharingApp) return;
    const shareUrl = `${window.location.origin}/?app=${encodeURIComponent(sharingApp.id)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      showToast('Link ya app imenakiliwa kwenye clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast('Haikuweza kunakili link.');
    }
  };

  // Upload/Submit app action (solves disappearing apps)
  const handleSubmitApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName.trim() || !uploadDownloadUrl.trim()) {
      showToast('Tafadhali jaza Jina la App na Download Link.');
      return;
    }

    setSubmittingApp(true);
    try {
      const res = await fetch('/api/apps/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadName.trim(),
          imageUrl: (uploadImageUrl || '').trim() || '/logo.svg',
          description: uploadDescription.trim() || 'App ya kisasa kwenye NADHILI App Store.',
          priceTZS: Number(uploadPrice) || 2500,
          downloadUrl: uploadDownloadUrl.trim(),
          version: uploadVersion.trim() || 'v1.0.0',
          size: uploadSize.trim() || '45 MB',
          category: uploadCategory.trim() || 'AI Tools & Mobile',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Haikuweza kuchapisha App');
      }

      showToast(`App ya "${uploadName}" imechapishwa na kuhifadhiwa kikamilifu!`);

      if (data.app) {
        setApps((prev) => [data.app, ...prev.filter((a) => a.id !== data.app.id)]);
        try {
          const cached = JSON.parse(localStorage.getItem('nadhili_public_apps_cache') || '[]');
          localStorage.setItem(
            'nadhili_public_apps_cache',
            JSON.stringify([data.app, ...cached.filter((a: any) => a.id !== data.app.id)])
          );
        } catch {}
      }

      // Reset form
      setUploadName('');
      setUploadDownloadUrl('');
      setUploadImageUrl('');
      setUploadDescription('');
      setIsUploadModalOpen(false);

      // Re-fetch to ensure sync
      fetchApps();
    } catch (err: any) {
      showToast(err.message || 'Hitilafu ya kutuma app');
    } finally {
      setSubmittingApp(false);
    }
  };

  const handleDeviceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToCompressedDataUrl(file, 256);
      setUploadImageUrl(dataUrl);
      showToast('Picha ya app imepakiwa kikamilifu!');
    } catch {
      showToast('Hitilafu ya kusoma picha.');
    }
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
              referrerPolicy="no-referrer"
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
          {/* Refresh Button */}
          <button
            onClick={() => fetchApps(true)}
            disabled={refreshing}
            title="Sasisha Orodha ya Apps"
            className="p-2 rounded-xl bg-[#1a1a18] text-neutral-400 hover:text-white border border-[#2b2b28] hover:border-[#da7756]/40 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#da7756]' : ''}`} />
          </button>

          {/* Filter Unlocked */}
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
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Programu za Kisasa za Premium (Apps)
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed">
            Chagua app unayoitaka, lipia kiasi chake kidogo kupitia namba yako ya simu (USSD Push), na link ya kupakua app hiyo itafunguka mara moja. Unaweza pia kushiriki app yoyote na marafiki!
          </p>

          {/* Search Box */}
          <div className="pt-2 max-w-md mx-auto relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tafuta app kwa jina, kategoria au maelezo..."
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
          <div className="py-20 text-center text-neutral-500 space-y-3">
            <ShoppingBag className="w-10 h-10 mx-auto text-neutral-600" />
            <p className="text-sm font-semibold text-neutral-400">Hakuna app iliyopatikana.</p>
            <p className="text-xs text-neutral-600">
              {filter === 'unlocked' ? 'Bado haujanunua app yoyote.' : 'Tafadhali badili neno la utafutaji au tuma app mpya.'}
            </p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 bg-[#da7756] hover:bg-[#e38161] text-white text-xs font-bold rounded-xl shadow transition"
            >
              Pakia App ya Kwanza Sasa
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApps.map((app) => {
              const isUnlocked = unlockedAppIds.includes(app.id);
              const isHighlighted = highlightedAppId === app.id;

              return (
                <div
                  key={app.id}
                  id={`app-card-${app.id}`}
                  className={`bg-[#181816] border rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 shadow-xl group relative ${
                    isHighlighted
                      ? 'border-[#da7756] ring-2 ring-[#da7756]/60 shadow-[0_0_30px_rgba(218,119,86,0.35)] scale-[1.01]'
                      : 'border-[#2a2a27] hover:border-[#da7756]/40 hover:shadow-[0_0_20px_rgba(218,119,86,0.1)]'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Top Row: Icon & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-[#22221f] border border-[#33332f] overflow-hidden p-1 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                        <img
                          src={cleanAppImageUrl(app.imageUrl)}
                          alt={app.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.target as any;
                            if (app.imageUrl && !target.src.includes('/api/proxy-image') && !target.src.includes('/logo.svg')) {
                              target.src = getProxiedImageUrl(app.imageUrl);
                            } else {
                              target.src = '/logo.svg';
                            }
                          }}
                          className="w-full h-full object-cover rounded-xl"
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

                  {/* Action Area: Buy/Download + Prominent Share Button */}
                  <div className="pt-4 border-t border-[#262623] mt-5 flex items-center gap-2">
                    {isUnlocked ? (
                      <button
                        onClick={() => handleDownloadApp(app.id, app.name)}
                        className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                        <span>Pakua App</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedAppForPurchase(app);
                          setPurchaseStatus('idle');
                          setStatusMessage('');
                          setOrderRef(null);
                        }}
                        className="flex-1 py-2.5 bg-gradient-to-r from-[#da7756] to-[#eb947a] hover:from-[#e38161] hover:to-[#f09f87] text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Lipia TZS {app.priceTZS.toLocaleString()}</span>
                      </button>
                    )}

                    {/* SHARE BUTTON */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenShare(app, e)}
                      title={`Shiriki App ya ${app.name}`}
                      className="px-3.5 py-2.5 bg-[#22221f] hover:bg-[#2d2d29] text-neutral-200 hover:text-[#da7756] border border-[#383834] rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 shrink-0 shadow"
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#da7756]" />
                      <span>Share</span>
                    </button>
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
                    src={cleanAppImageUrl(selectedAppForPurchase.imageUrl)}
                    alt={selectedAppForPurchase.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as any;
                      if (selectedAppForPurchase.imageUrl && !target.src.includes('/api/proxy-image') && !target.src.includes('/logo.svg')) {
                        target.src = getProxiedImageUrl(selectedAppForPurchase.imageUrl);
                      } else {
                        target.src = '/logo.svg';
                      }
                    }}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">
                    {selectedAppForPurchase.name}
                  </h3>
                  <p className="text-xs text-[#da7756] font-extrabold mt-0.5">
                    Bei: TZS {selectedAppForPurchase.priceTZS.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Share inside modal */}
                <button
                  onClick={(e) => handleOpenShare(selectedAppForPurchase, e)}
                  title="Shiriki app hii"
                  className="text-neutral-400 hover:text-white p-1.5 rounded-full hover:bg-[#282824] transition"
                >
                  <Share2 className="w-4 h-4 text-[#da7756]" />
                </button>
                <button
                  onClick={() => setSelectedAppForPurchase(null)}
                  className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-[#282824] transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
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
                      <span>Tazama Simu Yako Sasa!</span>
                    </p>
                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      Ujumbe wa malipo (USSD Push) umetokea kwenye namba yako. Weka PIN yako ya simu kukamilisha malipo ya{' '}
                      <strong>TZS {selectedAppForPurchase.priceTZS.toLocaleString()}</strong>.
                    </p>
                    <p className="text-xs font-mono text-neutral-400">
                      Muda uliobaki: <span className="text-[#da7756] font-bold">{countdown}s</span>
                    </p>
                  </div>
                )}

                {/* Status: Failed */}
                {purchaseStatus === 'failed' && (
                  <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 space-y-3 text-left">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <h5 className="text-xs font-bold text-red-300">Ombi la Malipo Halijafanikiwa</h5>
                    </div>
                    <p className="text-xs text-red-200/90 leading-relaxed">
                      {statusMessage || 'Mtandao wa simu haujakamilisha ombi la USSD Push.'}
                    </p>
                    {diagnosticMessage && (
                      <p className="text-[11px] font-mono text-neutral-400 bg-black/40 p-2.5 rounded-xl border border-white/5 break-all">
                        {diagnosticMessage}
                      </p>
                    )}
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

      {/* --- SHARE MODAL (Enables 1-click sharing to WhatsApp, Telegram, or Copying Link) --- */}
      {sharingApp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#1b1b19] border border-[#33332f] rounded-3xl max-w-md w-full p-6 text-neutral-200 relative shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#2b2b27]">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Share2 className="w-4 h-4 text-[#da7756]" />
                <span>Shiriki App Hii (Share App)</span>
              </div>
              <button
                onClick={() => setSharingApp(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-[#282824] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* App Preview Card in Share Modal */}
            <div className="flex items-center gap-3 p-3 bg-[#141412] rounded-2xl border border-[#2b2b28]">
              <img
                src={cleanAppImageUrl(sharingApp.imageUrl)}
                alt={sharingApp.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white truncate">{sharingApp.name}</h4>
                <p className="text-[11px] text-neutral-400 line-clamp-1">{sharingApp.description}</p>
                <p className="text-xs font-extrabold text-[#da7756] mt-0.5">
                  TZS {sharingApp.priceTZS.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Share Link Input with 1-click Copy */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-300">
                Link ya Moja kwa Moja ya App:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/?app=${encodeURIComponent(sharingApp.id)}`}
                  className="w-full bg-[#121211] border border-[#333330] rounded-xl px-3.5 py-2.5 text-xs text-neutral-200 font-mono focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                    copiedLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#da7756] hover:bg-[#e38161] text-white shadow'
                  }`}
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Imenakiliwa!' : 'Nakili Link'}</span>
                </button>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Mtu akibofya link hii ataelekezwa mara moja kwenye app hii ya{' '}
                <strong className="text-white">{sharingApp.name}</strong> kwenye kifaa chake!
              </p>
            </div>

            {/* Social Share Buttons */}
            <div className="space-y-2 pt-2 border-t border-[#262623]">
              <span className="text-[11px] text-neutral-400 font-medium block">
                Shiriki Haraka Kwenye Mitandao:
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/?app=${encodeURIComponent(sharingApp.id)}`;
                    const text = `Tazama na upakue app ya "${sharingApp.name}" kwenye NADHILI AI Store: ${url}`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="py-2.5 px-3 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/?app=${encodeURIComponent(sharingApp.id)}`;
                    window.open(
                      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(
                        `Pakua app ya ${sharingApp.name} kwenye NADHILI AI Store`
                      )}`,
                      '_blank'
                    );
                  }}
                  className="py-2.5 px-3 bg-[#0088cc]/15 hover:bg-[#0088cc]/25 border border-[#0088cc]/30 text-[#0088cc] text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Telegram</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- UPLOAD / SUBMIT NEW APP MODAL (Solves Disappearing Apps) --- */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-[#181816] border border-[#2e2e2a] rounded-3xl max-w-lg w-full p-6 text-neutral-200 relative shadow-2xl my-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#2b2b27]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#da7756]" />
                  <span>Pakia / Tuma App Yako (Submit App)</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  App itahifadhiwa kwenye Store na kuonekana papo hapo.
                </p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-[#282824] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitApp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Jina la App (App Name) *
                </label>
                <input
                  type="text"
                  required
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="Mfano: WhatsApp Mod Pro, Auto Bot AI, Video Pro"
                  className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Bei kwa TZS *
                  </label>
                  <input
                    type="number"
                    required
                    min={500}
                    value={uploadPrice}
                    onChange={(e) => setUploadPrice(e.target.value)}
                    placeholder="2500"
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Kategoria (Category)
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition"
                  >
                    <option value="AI Tools & Mobile">AI Tools & Mobile</option>
                    <option value="Android APK">Android APK Pro</option>
                    <option value="Productivity & Office">Productivity & Office</option>
                    <option value="Media & Video Editing">Media & Video Editing</option>
                    <option value="Security & VPN">Security & VPN</option>
                    <option value="Gaming & Mods">Gaming & Mods</option>
                  </select>
                </div>
              </div>

              {/* Image Input with Device Upload & Preset Icons */}
              <div className="bg-[#121211] p-3 rounded-2xl border border-[#2c2c28] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-300">
                    Picha / Icon ya App
                  </label>
                  <input
                    type="file"
                    ref={fileUploadInputRef}
                    onChange={handleDeviceImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileUploadInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#20201d] hover:bg-[#282824] border border-[#383834] rounded-xl text-[11px] text-neutral-200 transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#da7756]" />
                    <span>Pakia Faili kutoka Simu/Kifaa</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={uploadImageUrl}
                    onChange={(e) => setUploadImageUrl(e.target.value)}
                    placeholder="Weka URL ya picha au chagua hapa chini..."
                    className="flex-1 bg-[#181816] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                  />
                  <div className="w-9 h-9 rounded-lg bg-black/50 border border-[#383834] overflow-hidden flex items-center justify-center shrink-0 p-0.5">
                    <img
                      src={cleanAppImageUrl(uploadImageUrl)}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as any).src = '/logo.svg';
                      }}
                      className="w-full h-full object-cover rounded-md"
                    />
                  </div>
                </div>

                {/* Preset icons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_APP_ICONS.slice(0, 4).map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setUploadImageUrl(p.url);
                        showToast(`Picha ya "${p.name}" imewekwa.`);
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 bg-[#181816] hover:bg-[#252522] border border-[#30302c] rounded-lg text-[10px] text-neutral-300 transition"
                    >
                      <img src={p.url} alt={p.name} referrerPolicy="no-referrer" className="w-3.5 h-3.5 rounded object-cover" />
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Download Link ya App (Secret URL) *
                </label>
                <input
                  type="url"
                  required
                  value={uploadDownloadUrl}
                  onChange={(e) => setUploadDownloadUrl(e.target.value)}
                  placeholder="https://... (Mediafire, Mega, Google Drive, APK direct download)"
                  className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Toleo (Version)
                  </label>
                  <input
                    type="text"
                    value={uploadVersion}
                    onChange={(e) => setUploadVersion(e.target.value)}
                    placeholder="v1.0.0"
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Ukubwa (Size)
                  </label>
                  <input
                    type="text"
                    value={uploadSize}
                    onChange={(e) => setUploadSize(e.target.value)}
                    placeholder="45 MB"
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Maelezo ya App (Description)
                </label>
                <textarea
                  rows={2}
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Eleza sifa na faida za app hii kwa watumiaji..."
                  className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-[#22221f] text-neutral-400 hover:text-white text-xs font-semibold rounded-xl transition"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  disabled={submittingApp}
                  className="px-5 py-2 bg-gradient-to-r from-[#da7756] to-[#eb947a] hover:from-[#e38161] hover:to-[#f09f87] text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-1.5 disabled:opacity-50 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>{submittingApp ? 'Inatuma...' : 'Chapisha App Sasa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
