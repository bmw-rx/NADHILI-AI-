import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  CreditCard,
  Bell,
  MessageSquare,
  Lock,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Send,
  Crown,
  Search,
  CheckCircle2,
  AlertCircle,
  Database,
  BarChart3,
  Calendar,
  Layers,
  Smartphone,
  Plus,
  Trash2,
  ExternalLink,
  Key,
  Check,
  X,
  FileCode,
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  planCounts: Record<string, number>;
  totalRevenue: number;
  totalPayments: number;
  successfulPayments: number;
  totalConversations: number;
  totalMessages: number;
  recentPayments: any[];
  notificationsCount: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  created_at: number;
}

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  targetPlan?: string;
  createdAt: number;
}

interface AdminApp {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  priceTZS: number;
  downloadUrl: string;
  version?: string;
  size?: string;
  category?: string;
  createdAt: number;
}

interface AdminPanelProps {
  onBackToChat: () => void;
  showToast: (msg: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToChat, showToast }) => {
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('nadhili_admin_token'));
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'apps' | 'payments' | 'notifications'>('overview');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Apps Management State
  const [apps, setApps] = useState<AdminApp[]>([]);
  const [appName, setAppName] = useState('');
  const [appImageUrl, setAppImageUrl] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [appPrice, setAppPrice] = useState('3000');
  const [appDownloadUrl, setAppDownloadUrl] = useState('');
  const [appVersion, setAppVersion] = useState('v1.0.0');
  const [appSize, setAppSize] = useState('45 MB');
  const [appCategory, setAppCategory] = useState('AI Tools & Mobile');
  const [savingApp, setSavingApp] = useState(false);
  const [deletingAppId, setDeletingAppId] = useState<string | null>(null);

  // ClickPesa Payments Config & Gateway Monitoring
  const [clickpesaClientId, setClickpesaClientId] = useState('');
  const [clickpesaApiKey, setClickpesaApiKey] = useState('');
  const [clickpesaChecksumKey, setClickpesaChecksumKey] = useState('');
  const [clickpesaBaseUrl, setClickpesaBaseUrl] = useState('https://api.clickpesa.com');
  const [savingClickPesa, setSavingClickPesa] = useState(false);
  const [testingClickPesa, setTestingClickPesa] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [approvingOrderRef, setApprovingOrderRef] = useState<string | null>(null);

  // Notification creation form
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTargetPlan, setNotifTargetPlan] = useState<'all' | 'free' | 'normal' | 'hard' | 'ultra'>('all');
  const [sendingNotif, setSendingNotif] = useState(false);

  // User plan updating
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    if (!pinInput.trim()) {
      setPinError('Tafadhali ingiza nenosiri la admin.');
      return;
    }

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pinInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Nenosiri si sahihi');
      }

      localStorage.setItem('nadhili_admin_token', data.token);
      setAdminToken(data.token);
      showToast('Karibu kwenye NADHILI AI Admin Panel!');
    } catch (err: any) {
      setPinError(err.message || 'Hitilafu ya kuingia');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nadhili_admin_token');
    setAdminToken(null);
    setPinInput('');
    showToast('Umetoka kwenye Admin Panel');
  };

  const fetchAdminData = async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const headers = {
        Authorization: `Bearer ${adminToken}`,
        'x-admin-key': '3006',
      };

      const [resStats, resUsers, resNotifs, resApps, resPayList, resCpConfig] = await Promise.all([
        fetch('/api/admin/overview', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/notifications'),
        fetch('/api/admin/apps', { headers }),
        fetch('/api/admin/payments', { headers }),
        fetch('/api/payments/clickpesa/config'),
      ]);

      if (resStats.ok) {
        const statsData = await resStats.json();
        setStats(statsData);
      }
      if (resUsers.ok) {
        const usersData = await resUsers.json();
        setUsers(usersData.users || []);
      }
      if (resNotifs.ok) {
        const notifsData = await resNotifs.json();
        setNotifications(notifsData.notifications || []);
      }
      if (resApps.ok) {
        const appsData = await resApps.json();
        setApps(appsData.apps || []);
      }
      if (resPayList.ok) {
        const payData = await resPayList.json();
        setPaymentsList(payData.payments || []);
      }
      if (resCpConfig.ok) {
        const cpData = await resCpConfig.json();
        setClickpesaBaseUrl(cpData.baseUrl || 'https://api.clickpesa.com');
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) {
      fetchAdminData();
    }
  }, [adminToken]);

  const handleUpdatePlan = async (userId: string, newPlan: string) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
          'x-admin-key': '3006',
        },
        body: JSON.stringify({ plan: newPlan }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Haikuweza kubadilisha plan');
      }

      showToast(`Mtumiaji amepewa mpango wa ${newPlan.toUpperCase()}!`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, plan: newPlan } : u))
      );
      if (stats) {
        fetchAdminData();
      }
    } catch (err: any) {
      showToast(err.message || 'Hitilafu ya kubadili mpango');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      showToast('Tafadhali jaza kichwa cha habari na ujumbe.');
      return;
    }

    setSendingNotif(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
          'x-admin-key': '3006',
        },
        body: JSON.stringify({
          title: notifTitle.trim(),
          message: notifMessage.trim(),
          targetPlan: notifTargetPlan === 'all' ? undefined : notifTargetPlan,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Haikuweza kutuma arifa');
      }

      showToast('Arifa imetumwa kikamilifu kwa watumiaji!');
      setNotifTitle('');
      setNotifMessage('');

      if (Notification.permission === 'granted') {
        new Notification(notifTitle, {
          body: notifMessage,
          icon: '/logo.svg',
        });
      }

      fetchAdminData();
    } catch (err: any) {
      showToast(err.message || 'Hitilafu ya kutuma taarifa');
    } finally {
      setSendingNotif(false);
    }
  };

  // Add Premium App
  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim() || !appDownloadUrl.trim()) {
      showToast('Tafadhali jaza jina la app na download link.');
      return;
    }

    setSavingApp(true);
    try {
      const res = await fetch('/api/admin/apps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
          'x-admin-key': '3006',
        },
        body: JSON.stringify({
          name: appName.trim(),
          imageUrl: (appImageUrl || '').trim() || '/logo.svg',
          description: appDescription.trim(),
          priceTZS: Number(appPrice) || 3000,
          downloadUrl: appDownloadUrl.trim(),
          version: appVersion.trim() || 'v1.0.0',
          size: appSize.trim() || '50 MB',
          category: appCategory.trim() || 'AI Tools',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Haikuweza kuhifadhi App');
      }

      showToast(`App ya "${appName}" imeongezwa kikamilifu!`);
      setAppName('');
      setAppImageUrl('');
      setAppDescription('');
      setAppDownloadUrl('');
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message || 'Hitilafu ya kuongeza app');
    } finally {
      setSavingApp(false);
    }
  };

  // Delete Premium App
  const handleDeleteApp = async (id: string, name: string) => {
    if (!confirm(`Je, una uhakika unataka kufuta app ya "${name}"?`)) return;
    setDeletingAppId(id);
    try {
      const res = await fetch(`/api/admin/apps/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'x-admin-key': '3006',
        },
      });
      if (res.ok) {
        showToast('App imefutwa kikamilifu.');
        setApps((prev) => prev.filter((a) => a.id !== id));
      } else {
        showToast('Haikuweza kufuta app');
      }
    } catch {
      showToast('Hitilafu ya kufuta app');
    } finally {
      setDeletingAppId(null);
    }
  };

  // Save ClickPesa Configuration
  const handleSaveClickPesa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingClickPesa(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/payments/clickpesa/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clickpesaClientId.trim(),
          apiKey: clickpesaApiKey.trim(),
          checksumKey: clickpesaChecksumKey.trim(),
          baseUrl: clickpesaBaseUrl.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Mipangilio ya ClickPesa imehifadhiwa!');
      } else {
        showToast(data.error || 'Hitilafu ya kuhifadhi mipangilio');
      }
    } catch {
      showToast('Hitilafu ya kuhifadhi ClickPesa config');
    } finally {
      setSavingClickPesa(false);
    }
  };

  // Test ClickPesa Live Connection
  const handleTestClickPesa = async () => {
    setTestingClickPesa(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/payments/clickpesa/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clickpesaClientId.trim(),
          apiKey: clickpesaApiKey.trim(),
          baseUrl: clickpesaBaseUrl.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: data.message });
        showToast('ClickPesa imeunganishwa na inafanya kazi 100%!');
      } else {
        setTestResult({ success: false, message: data.error || 'Uthibitisho umeshindwa' });
        showToast('Hitilafu ya kuunganisha na ClickPesa');
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Hitilafu ya mtandao' });
    } finally {
      setTestingClickPesa(false);
    }
  };

  // Approve Payment / Unlock App
  const handleApprovePayment = async (orderRef: string) => {
    setApprovingOrderRef(orderRef);
    try {
      const res = await fetch(`/api/admin/payments/${orderRef}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'x-admin-key': '3006',
        },
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Malipo yameidhinishwa!');
        fetchAdminData();
      } else {
        showToast(data.error || 'Haikuweza kuidhinisha malipo');
      }
    } catch {
      showToast('Hitilafu ya kuidhinisha');
    } finally {
      setApprovingOrderRef(null);
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.plan.toLowerCase().includes(userSearch.toLowerCase())
  );

  // --- PASSWORD LOCK SCREEN ---
  if (!adminToken) {
    return (
      <div className="min-h-screen bg-[#0e0e0d] text-[#ede8dd] flex items-center justify-center p-4 font-sans selection:bg-[#da7756]/30">
        <div className="w-full max-w-sm bg-[#181816] border border-[#2b2b28] rounded-3xl p-7 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <img
              src="/logo.svg"
              alt="NADHILI AI Logo"
              className="w-14 h-14 rounded-2xl object-contain mx-auto shadow-[0_0_15px_rgba(218,119,86,0.3)]"
            />
            <h2 className="text-lg font-bold text-white tracking-wide">NADHILI AI • Admin Central</h2>
            <p className="text-xs text-neutral-400">Ingiza nenosiri la siri (PIN: 3006) ili kufungua paneli</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Nenosiri la Admin (PIN):
              </label>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Ingiza nenosiri..."
                autoFocus
                className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none transition text-center tracking-widest font-mono"
              />
            </div>

            {pinError && (
              <p className="text-xs text-red-400 text-center bg-red-500/10 border border-red-500/20 py-1.5 rounded-lg">
                {pinError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-[#da7756] to-[#eb947a] hover:from-[#e38161] hover:to-[#f09f87] text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95"
            >
              Fungua Paneli
            </button>
          </form>

          <button
            onClick={onBackToChat}
            className="w-full text-xs text-neutral-500 hover:text-neutral-300 flex items-center justify-center gap-1.5 pt-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Rudi kwenye Gumzo (Chat)</span>
          </button>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-2">
            <img
              src="/logo.svg"
              alt="NADHILI AI"
              className="w-7 h-7 rounded-lg object-contain shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-bold text-white">NADHILI AI Admin Panel</h1>
                <span className="text-[10px] bg-[#da7756]/20 text-[#da7756] border border-[#da7756]/30 px-2 py-0.2 rounded-full font-mono uppercase font-semibold">
                  Root Admin
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdminData}
            title="Refresh takwimu"
            className="text-neutral-400 hover:text-white p-2 rounded-xl bg-[#1a1a18] border border-[#2b2b28] hover:bg-[#252522] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#da7756]' : ''}`} />
          </button>
          <button
            onClick={handleLogout}
            className="text-xs text-neutral-400 hover:text-red-400 px-3 py-1.5 rounded-xl bg-[#1a1a18] border border-[#2b2b28] hover:border-red-500/30 transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#242421] pb-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'overview'
                ? 'bg-[#da7756] text-white shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-[#1a1a18]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Muhtasari (Overview)</span>
          </button>

          <button
            onClick={() => setActiveTab('apps')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'apps'
                ? 'bg-[#da7756] text-white shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-[#1a1a18]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            <span>App Premium (Store)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">
              {apps.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'payments'
                ? 'bg-[#da7756] text-white shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-[#1a1a18]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            <span>Malipo & ClickPesa</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'users'
                ? 'bg-[#da7756] text-white shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-[#1a1a18]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Watumiaji & Mipango ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'notifications'
                ? 'bg-[#da7756] text-white shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-[#1a1a18]'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-sky-400" />
            <span>Tuma Arifa (Notifications)</span>
          </button>
        </div>

        {/* --- TAB 1: OVERVIEW --- */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#181816] border border-[#2b2b28] rounded-2xl p-5 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-xs font-medium uppercase tracking-wider">Jumla ya Watumiaji</span>
                  <Users className="w-4 h-4 text-[#da7756]" />
                </div>
                <div className="text-2xl font-extrabold text-white">{stats.totalUsers}</div>
                <p className="text-[11px] text-neutral-400">Wamesajiliwa kwenye database</p>
              </div>

              <div className="bg-[#181816] border border-[#2b2b28] rounded-2xl p-5 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-xs font-medium uppercase tracking-wider">Mapato ya Malipo</span>
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-extrabold text-white">
                  TZS {stats.totalRevenue.toLocaleString()}
                </div>
                <p className="text-[11px] text-emerald-400 font-medium">
                  {stats.successfulPayments} miamala iliyofaulu
                </p>
              </div>

              <div className="bg-[#181816] border border-[#2b2b28] rounded-2xl p-5 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-xs font-medium uppercase tracking-wider">Gumzo & Ujumbe</span>
                  <MessageSquare className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl font-extrabold text-white">{stats.totalConversations}</div>
                <p className="text-[11px] text-neutral-400">{stats.totalMessages} jumla ya ujumbe</p>
              </div>

              <div className="bg-[#181816] border border-[#2b2b28] rounded-2xl p-5 shadow-sm space-y-1">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-xs font-medium uppercase tracking-wider">Watumiaji wa Pro</span>
                  <Crown className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-extrabold text-white">
                  {(stats.planCounts.hard || 0) + (stats.planCounts.ultra || 0) + (stats.planCounts.normal || 0)}
                </div>
                <p className="text-[11px] text-neutral-400">Hard, Ultra & Normal</p>
              </div>
            </div>

            {/* Plan Breakdown & Storage */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#181816] border border-[#2b2b28] rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#da7756]" />
                  <span>Mgawanyo wa Mipango (Plans Breakdown)</span>
                </h3>

                <div className="space-y-3">
                  {Object.entries(stats.planCounts).map(([planName, count]) => {
                    const total = stats.totalUsers || 1;
                    const percent = Math.round((count / total) * 100);
                    return (
                      <div key={planName} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="capitalize font-medium text-neutral-200">{planName}</span>
                          <span className="font-mono text-neutral-400">
                            {count} ({percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#242421] rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              planName === 'ultra'
                                ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                                : planName === 'hard'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                : planName === 'normal'
                                ? 'bg-gradient-to-r from-sky-500 to-blue-500'
                                : 'bg-neutral-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#181816] border border-[#2b2b28] rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Hifadhi na Data (System Status)</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#1f1f1c] border border-[#2d2d2a]">
                    <span className="text-neutral-300">Database Engine:</span>
                    <span className="font-semibold text-emerald-400 font-mono">
                      PostgreSQL / Cloud Edge Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#1f1f1c] border border-[#2d2d2a]">
                    <span className="text-neutral-300">ClickPesa USSD Push:</span>
                    <span className="font-semibold text-emerald-400 font-mono">
                      Licensed Gateway (Tanzania)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#1f1f1c] border border-[#2d2d2a]">
                    <span className="text-neutral-300">Programu za Premium:</span>
                    <span className="font-semibold text-amber-400 font-mono">
                      {apps.length} zimechapishwa
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#1f1f1c] border border-[#2d2d2a]">
                    <span className="text-neutral-300">Multimodal AI Vision:</span>
                    <span className="font-semibold text-sky-400 font-mono">
                      Gemini 3.8 Flash Active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: APP PREMIUM (STORE) --- */}
        {activeTab === 'apps' && (
          <div className="space-y-6">
            {/* Upload New App Form */}
            <div className="bg-[#181816] border border-[#2b2b28] rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-[#2b2b28] pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#da7756]" />
                    <span>Pakia App Mpya ya Premium (Upload App)</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Weka jina la app, picha kwa URL, na download link. Download link italindwa na itafunguka tu baada ya malipo ya mtumiaji kufaulu!
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateApp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Jina la App (App Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="Mfano: WhatsApp Mod Pro, Auto Bot AI, VPN VIP"
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Bei kwa TZS (Price) *
                  </label>
                  <input
                    type="number"
                    required
                    min={500}
                    value={appPrice}
                    onChange={(e) => setAppPrice(e.target.value)}
                    placeholder="3000"
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Picha ya App kwa URL (Image/Icon URL)
                  </label>
                  <input
                    type="url"
                    value={appImageUrl}
                    onChange={(e) => setAppImageUrl(e.target.value)}
                    placeholder="/logo.svg au URL nyingine ya picha ya app"
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Download Link ya App (Secret Download URL) *
                  </label>
                  <input
                    type="url"
                    required
                    value={appDownloadUrl}
                    onChange={(e) => setAppDownloadUrl(e.target.value)}
                    placeholder="https://... (Mediafire, Mega, Google Drive, APK direct link)"
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Toleo (Version) & Ukubwa (Size)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={appVersion}
                      onChange={(e) => setAppVersion(e.target.value)}
                      placeholder="v2.4.0"
                      className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                    />
                    <input
                      type="text"
                      value={appSize}
                      onChange={(e) => setAppSize(e.target.value)}
                      placeholder="45 MB"
                      className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Kategoria (Category)
                  </label>
                  <select
                    value={appCategory}
                    onChange={(e) => setAppCategory(e.target.value)}
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition"
                  >
                    <option value="AI Tools & Mobile">AI Tools & Mobile</option>
                    <option value="Android APK">Android APK Pro</option>
                    <option value="Productivity & Office">Productivity & Office</option>
                    <option value="Media & Video Editing">Media & Video Editing</option>
                    <option value="Security & VPN">Security & VPN</option>
                    <option value="Gaming & Mods">Gaming & Mods</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Maelezo ya App (Description)
                  </label>
                  <textarea
                    rows={2}
                    value={appDescription}
                    onChange={(e) => setAppDescription(e.target.value)}
                    placeholder="Eleza sifa na faida za hii app..."
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingApp}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#da7756] to-[#eb947a] hover:from-[#e38161] hover:to-[#f09f87] text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{savingApp ? 'Inapakia...' : 'Chapisha App Hii kwenye Store'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* List of Uploaded Apps */}
            <div className="bg-[#181816] border border-[#2b2b28] rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>App Zote Zilizochapishwa ({apps.length})</span>
                </h3>
                <span className="text-xs text-emerald-400 font-mono">
                  Download Link imefungwa kwa usalama
                </span>
              </div>

              {apps.length === 0 ? (
                <div className="text-center py-12 text-xs text-neutral-500">
                  Hakuna app ya premium iliyopakiwa bado. Tumia fomu iliyo hapo juu kupakia app ya kwanza!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {apps.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-2xl bg-[#141412] border border-[#2a2a27] hover:border-[#da7756]/40 transition space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <img
                            src={app.imageUrl || '/logo.svg'}
                            alt={app.name}
                            onError={(e) => {
                              (e.target as any).src = '/logo.svg';
                            }}
                            className="w-12 h-12 rounded-xl object-cover bg-black/40 border border-[#333] shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-white truncate">{app.name}</h4>
                            <p className="text-[10px] text-neutral-400">{app.category || 'App'} • {app.version || 'v1.0'}</p>
                            <p className="text-xs font-extrabold text-emerald-400 mt-1">
                              TZS {app.priceTZS.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <p className="text-[11px] text-neutral-300 line-clamp-2 leading-relaxed">
                          {app.description || 'Hakuna maelezo yaliyowekwa.'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#262623] space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono truncate">
                          <span className="truncate max-w-[170px]" title={app.downloadUrl}>
                            Link: {app.downloadUrl}
                          </span>
                          <a
                            href={app.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#da7756] hover:underline flex items-center gap-0.5 shrink-0"
                          >
                            <span>Jaribu</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Imefungwa hadi ilipiwe
                          </span>
                          <button
                            onClick={() => handleDeleteApp(app.id, app.name)}
                            disabled={deletingAppId === app.id}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition"
                            title="Futa app hii"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 3: PAYMENTS & CLICKPESA --- */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            {/* ClickPesa API Configuration */}
            <div className="bg-[#181816] border border-[#2b2b28] rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-[#2b2b28] pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-400" />
                    <span>Mipangilio ya Malipo ya Simu (ClickPesa Gateway)</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Unganisha akaunti yako ya ClickPesa kwa kuweka Client ID na API Key kutoka kwenye dashibodi ya ClickPesa.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestClickPesa}
                    disabled={testingClickPesa}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${testingClickPesa ? 'animate-spin' : ''}`} />
                    <span>{testingClickPesa ? 'Inajaribu...' : 'Jaribu Muunganisho (Test)'}</span>
                  </button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <form onSubmit={handleSaveClickPesa} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    ClickPesa Client ID
                  </label>
                  <input
                    type="text"
                    value={clickpesaClientId}
                    onChange={(e) => setClickpesaClientId(e.target.value)}
                    placeholder="Weka Client ID yako kutoka ClickPesa"
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    ClickPesa API Key
                  </label>
                  <input
                    type="password"
                    value={clickpesaApiKey}
                    onChange={(e) => setClickpesaApiKey(e.target.value)}
                    placeholder="Weka API Key yako"
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Checksum Secret Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={clickpesaChecksumKey}
                    onChange={(e) => setClickpesaChecksumKey(e.target.value)}
                    placeholder="Weka Checksum Key (ikihitajika)"
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Base URL (Production)
                  </label>
                  <input
                    type="text"
                    value={clickpesaBaseUrl}
                    onChange={(e) => setClickpesaBaseUrl(e.target.value)}
                    placeholder="https://api.clickpesa.com"
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition font-mono"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-2">
                  <button
                    type="submit"
                    disabled={savingClickPesa}
                    className="px-5 py-2 bg-gradient-to-r from-[#da7756] to-[#eb947a] hover:from-[#e38161] hover:to-[#f09f87] text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{savingClickPesa ? 'Inahifadhi...' : 'Hifadhi Mipangilio ya Malipo'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Recent Payments Table */}
            <div className="bg-[#181816] border border-[#2b2b28] rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Miamala ya Malipo ya Simu (USSD Transactions)</span>
                </h3>
                <span className="text-xs text-neutral-400">
                  {paymentsList.length} miamala imerekodiwa
                </span>
              </div>

              {paymentsList.length === 0 ? (
                <div className="text-center py-12 text-xs text-neutral-500">
                  Hakuna miamala ya malipo iliyofanyika bado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-neutral-300">
                    <thead className="bg-[#141412] text-neutral-400 border-b border-[#292926] text-[11px] uppercase tracking-wider font-mono">
                      <tr>
                        <th className="p-3">Order Ref</th>
                        <th className="p-3">Simu</th>
                        <th className="p-3">Kiasi</th>
                        <th className="p-3">Aina / Plan</th>
                        <th className="p-3">Hali (Status)</th>
                        <th className="p-3">Tarehe</th>
                        <th className="p-3 text-right">Kitendo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#242421]">
                      {paymentsList.map((p) => (
                        <tr key={p.id || p.orderReference} className="hover:bg-[#1f1f1c] transition">
                          <td className="p-3 font-mono font-bold text-white">{p.orderReference}</td>
                          <td className="p-3 font-mono text-neutral-300">{p.phoneNumber}</td>
                          <td className="p-3 font-extrabold text-emerald-400 font-mono">
                            TZS {(p.amount || 0).toLocaleString()}
                          </td>
                          <td className="p-3 capitalize">
                            <span className="px-2 py-0.5 rounded-md bg-[#252522] border border-[#333] text-[10px]">
                              {p.plan}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                                p.status === 'SUCCESS'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : p.status === 'FAILED'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="p-3 text-[10px] text-neutral-400 font-mono">
                            {new Date(p.createdAt || p.created_at || Date.now()).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="p-3 text-right">
                            {p.status !== 'SUCCESS' ? (
                              <button
                                onClick={() => handleApprovePayment(p.orderReference)}
                                disabled={approvingOrderRef === p.orderReference}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition text-[10px] font-bold active:scale-95 disabled:opacity-50"
                              >
                                {approvingOrderRef === p.orderReference ? '...' : 'Idhinisha'}
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-400 flex items-center justify-end gap-1 font-medium">
                                <Check className="w-3.5 h-3.5" />
                                <span>Imekamilika</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 4: USERS & PLAN ASSIGNMENT --- */}
        {activeTab === 'users' && (
          <div className="bg-[#181816] border border-[#2b2b28] rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#da7756]" />
                  <span>Watumiaji Waliojisajili (Registered Accounts)</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Wape watumiaji Pro Plan (Normal, Hard, Ultra) moja kwa moja kwa kubofya.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Tafuta mtumiaji au email..."
                  className="w-full bg-[#121211] border border-[#2d2d2a] focus:border-[#da7756] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-[#141412] text-neutral-400 border-b border-[#292926] text-[11px] uppercase tracking-wider font-mono">
                  <tr>
                    <th className="p-3">Jina</th>
                    <th className="p-3">Barua Pepe (Email)</th>
                    <th className="p-3">Mpango (Plan)</th>
                    <th className="p-3">Tarehe ya Usajili</th>
                    <th className="p-3 text-right">Badili Mpango (Assign Plan)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242421]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-neutral-500">
                        Hakuna mtumiaji aliyepatikana.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isUpdating = updatingUserId === u.id;
                      return (
                        <tr key={u.id} className="hover:bg-[#1f1f1c] transition">
                          <td className="p-3 font-semibold text-white flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#da7756] to-[#eb947a] text-white flex items-center justify-center font-bold text-[10px]">
                              {u.name.slice(0, 1).toUpperCase()}
                            </div>
                            <span>{u.name}</span>
                          </td>
                          <td className="p-3 font-mono text-neutral-300">{u.email}</td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider border ${
                                u.plan === 'ultra'
                                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                  : u.plan === 'hard'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : u.plan === 'normal'
                                  ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                                  : 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
                              }`}
                            >
                              {u.plan || 'Free'}
                            </span>
                          </td>
                          <td className="p-3 text-neutral-400 font-mono text-[11px]">
                            {new Date(u.created_at * 1000).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              {(['free', 'normal', 'hard', 'ultra'] as const).map((pOption) => {
                                const isCurrent = (u.plan || 'free').toLowerCase() === pOption;
                                return (
                                  <button
                                    key={pOption}
                                    disabled={isCurrent || isUpdating}
                                    onClick={() => handleUpdatePlan(u.id, pOption)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition active:scale-95 ${
                                      isCurrent
                                        ? 'bg-[#2b2b28] text-white opacity-60 cursor-default'
                                        : 'bg-[#1e1e1b] hover:bg-[#da7756] text-neutral-300 hover:text-white border border-[#333330]'
                                    }`}
                                  >
                                    {pOption}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 5: BROADCAST NOTIFICATIONS --- */}
        {activeTab === 'notifications' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create Notification Form */}
            <div className="bg-[#181816] border border-[#2b2b28] rounded-3xl p-6 shadow-xl space-y-5">
              <div className="border-b border-[#2b2b28] pb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#da7756]" />
                  <span>Tuma Taarifa (Push Notification) Kwenye App</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Arifa hii itaonekana mara moja kwenye kengele ya programu kwa watumiaji wote au mpango maalum.
                </p>
              </div>

              <form onSubmit={handleSendNotification} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Kichwa cha Habari (Title) *
                  </label>
                  <input
                    type="text"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="Mfano: Ofa ya Pasaka! Punguzo la 50% kwenye Ultra"
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Ujumbe Kamili (Message Body) *
                  </label>
                  <textarea
                    rows={4}
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    placeholder="Andika ujumbe wako hapa..."
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none transition resize-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Mlengwa wa Arifa (Target Audience)
                  </label>
                  <select
                    value={notifTargetPlan}
                    onChange={(e) => setNotifTargetPlan(e.target.value as any)}
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none transition"
                  >
                    <option value="all">Watumiaji Wote (All Users)</option>
                    <option value="free">Watumiaji wa Mpango wa Bure (Free)</option>
                    <option value="normal">Watumiaji wa Plan ya Normal</option>
                    <option value="hard">Watumiaji wa Plan ya Hard</option>
                    <option value="ultra">Watumiaji wa Plan ya Ultra (VIP)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={sendingNotif}
                  className="w-full py-2.5 bg-gradient-to-r from-[#da7756] to-[#eb947a] hover:from-[#e38161] hover:to-[#f09f87] text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingNotif ? 'Inatuma...' : 'Tuma Notification Kwenye App'}</span>
                </button>
              </form>
            </div>

            {/* Previously Sent Notifications */}
            <div className="bg-[#181816] border border-[#2b2b28] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  <span>Taarifa Zilizotumwa Hivi Karibuni</span>
                </h3>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <div className="text-center py-12 text-xs text-neutral-500">
                      Hakuna taarifa iliyotumwa bado.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="p-3.5 rounded-2xl bg-[#1e1e1b] border border-[#2f2f2c] space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{notif.title}</span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300 leading-relaxed">{notif.message}</p>
                        <div className="flex items-center gap-2 pt-1 text-[10px] text-neutral-500 font-mono">
                          <span>Target: {notif.targetPlan || 'all'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-[#272724] text-[11px] text-neutral-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Watumiaji hupokea arifa papo hapo wanapofungua app.</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
