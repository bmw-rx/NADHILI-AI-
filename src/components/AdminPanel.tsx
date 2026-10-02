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

interface AdminPanelProps {
  onBackToChat: () => void;
  showToast: (msg: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToChat, showToast }) => {
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('nadhili_admin_token'));
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'notifications'>('overview');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

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

      const [resStats, resUsers, resNotifs] = await Promise.all([
        fetch('/api/admin/overview', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/notifications'),
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
      // Update local state
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
      showToast('Kichwa na ujumbe wa taarifa vinahitajika.');
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
          targetPlan: notifTargetPlan,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Haikuweza kutuma notification');
      }

      showToast('Notification imetumwa kwenye app kikamilifu!');
      setNotifTitle('');
      setNotifMessage('');

      // Send local browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notifTitle.trim(), {
          body: notifMessage.trim(),
          icon: '/favicon.ico',
        });
      }

      fetchAdminData();
    } catch (err: any) {
      showToast(err.message || 'Hitilafu ya kutuma taarifa');
    } finally {
      setSendingNotif(false);
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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#da7756] to-[#eb947a] text-white flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(218,119,86,0.3)]">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide">NADHILI AI • Admin Central</h2>
            <p className="text-xs text-neutral-400">Ingiza nenosiri la siri (PIN) ili kufungua paneli</p>
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
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#da7756] to-[#eb947a] text-white font-serif font-bold text-xs flex items-center justify-center shadow-sm">
              N
            </div>
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
        <div className="flex items-center gap-2 border-b border-[#242421] pb-3">
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
            <Bell className="w-3.5 h-3.5" />
            <span>Tuma Notification ({notifications.length})</span>
          </button>
        </div>

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#181816] border border-[#2a2a27] rounded-2xl p-4">
                <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                  <span>Watumiaji Waliojisajili</span>
                  <Users className="w-4 h-4 text-sky-400" />
                </div>
                <p className="text-2xl font-bold text-white">{stats?.totalUsers || users.length}</p>
                <p className="text-[11px] text-neutral-500 mt-1">Akaunti za mfumo</p>
              </div>

              <div className="bg-[#181816] border border-[#2a2a27] rounded-2xl p-4">
                <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                  <span>Mapato ya Malipo</span>
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-emerald-400">
                  TZS {(stats?.totalRevenue || 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Miamala {stats?.successfulPayments || 0} iliyofaulu
                </p>
              </div>

              <div className="bg-[#181816] border border-[#2a2a27] rounded-2xl p-4">
                <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                  <span>Mazungumzo (Chats)</span>
                  <MessageSquare className="w-4 h-4 text-[#da7756]" />
                </div>
                <p className="text-2xl font-bold text-white">{stats?.totalConversations || 0}</p>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Ujumbe {stats?.totalMessages || 0} uliotumwa
                </p>
              </div>

              <div className="bg-[#181816] border border-[#2a2a27] rounded-2xl p-4">
                <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                  <span>Watumiaji wa Pro</span>
                  <Crown className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-amber-400">
                  {(stats?.planCounts.normal || 0) + (stats?.planCounts.hard || 0) + (stats?.planCounts.ultra || 0)}
                </p>
                <p className="text-[11px] text-neutral-500 mt-1">Normal, Hard na Ultra</p>
              </div>
            </div>

            {/* Plan Distribution Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#181816] border border-[#2a2a27] rounded-3xl p-5">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#da7756]" />
                  <span>Mgawanyo wa Mipango (Plans Breakdown)</span>
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#1f1f1d] border border-[#30302d]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-neutral-500" />
                      <span className="text-xs font-medium text-white">Free Plan</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-neutral-300">
                      {stats?.planCounts.free || 0} Watumiaji
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#1f1f1d] border border-[#30302d]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span className="text-xs font-medium text-white">Plan ya Normal (TZS 2,000)</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {stats?.planCounts.normal || 0} Watumiaji
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#1f1f1d] border border-[#30302d]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#da7756]" />
                      <span className="text-xs font-medium text-white">Plan ya Hard (TZS 5,000)</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#da7756]">
                      {stats?.planCounts.hard || 0} Watumiaji
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#1f1f1d] border border-[#30302d]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                      <span className="text-xs font-medium text-white">Plan ya Ultra (TZS 10,000)</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-purple-400">
                      {stats?.planCounts.ultra || 0} Watumiaji
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Notification Overview */}
              <div className="bg-[#181816] border border-[#2a2a27] rounded-3xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>NADHILI AI System Features</span>
                  </h3>
                  <div className="space-y-2.5 text-xs text-neutral-300">
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span><strong>NADHILI Video AI:</strong> Uundaji wa Video za AI unafanya kazi kikamilifu</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span><strong>NADHILI Voice TTS:</strong> Sauti nyingi (Swahili, English, French, Arabic)</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span><strong>NADHILI Bible AI:</strong> Uchunguzi wa Maandiko Matakatifu na Theolojia</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span><strong>Mobile Money USSD Push:</strong> Malipo kuanzia TZS 2,000 tu</span>
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#272724] mt-4 flex items-center gap-3">
                  <button
                    onClick={() => setActiveTab('users')}
                    className="flex-1 py-2.5 bg-[#252522] hover:bg-[#30302d] text-white text-xs font-semibold rounded-xl transition text-center"
                  >
                    Tazama Watumiaji Wote
                  </button>
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className="flex-1 py-2.5 bg-[#da7756] hover:bg-[#eb947a] text-white text-xs font-semibold rounded-xl transition text-center"
                  >
                    Tuma Taarifa (Push)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. USERS MANAGEMENT TAB */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Search Bar */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Tafuta mtumiaji kwa jina, barua pepe au mpango..."
                  className="w-full bg-[#181816] border border-[#2d2d29] focus:border-[#da7756] focus:outline-none rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 transition"
                />
              </div>

              <span className="text-xs text-neutral-400 font-mono">
                Jumla: {filteredUsers.length} watumiaji
              </span>
            </div>

            {/* Users Table */}
            <div className="bg-[#181816] border border-[#2b2b28] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-[#1e1e1b] text-neutral-400 uppercase font-mono text-[10px] border-b border-[#2d2d29]">
                    <tr>
                      <th className="py-3 px-4">Mtumiaji</th>
                      <th className="py-3 px-4">Barua Pepe</th>
                      <th className="py-3 px-4">Tarehe ya Kujiunga</th>
                      <th className="py-3 px-4">Mpango wa Sasa</th>
                      <th className="py-3 px-4 text-right">Weka / Badilisha Mpango (Pro Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262623]">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-neutral-500">
                          Hakuna mtumiaji aliyepatikana.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const currentPlan = (user.plan || 'free').toLowerCase();
                        const isUpdating = updatingUserId === user.id;

                        return (
                          <tr key={user.id} className="hover:bg-[#1f1f1c] transition">
                            <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#da7756]/20 border border-[#da7756]/40 text-[#da7756] flex items-center justify-center font-bold text-xs shrink-0">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[140px]">{user.name}</span>
                            </td>
                            <td className="py-3 px-4 font-mono text-neutral-400 truncate max-w-[180px]">
                              {user.email}
                            </td>
                            <td className="py-3 px-4 text-neutral-500 text-[11px] font-mono">
                              {new Date(user.created_at * 1000).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${
                                  currentPlan === 'ultra'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                    : currentPlan === 'hard'
                                    ? 'bg-[#da7756]/20 text-[#da7756] border border-[#da7756]/40'
                                    : currentPlan === 'normal'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                                }`}
                              >
                                {currentPlan}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  disabled={isUpdating || currentPlan === 'free'}
                                  onClick={() => handleUpdatePlan(user.id, 'free')}
                                  title="Weka Mpango wa Bure"
                                  className="px-2 py-1 rounded-lg text-[10px] font-medium bg-[#242421] hover:bg-[#30302c] text-neutral-300 disabled:opacity-40 transition"
                                >
                                  Free
                                </button>
                                <button
                                  disabled={isUpdating || currentPlan === 'normal'}
                                  onClick={() => handleUpdatePlan(user.id, 'normal')}
                                  title="Weka Normal Plan (TZS 2,000)"
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 disabled:opacity-40 transition"
                                >
                                  + Normal
                                </button>
                                <button
                                  disabled={isUpdating || currentPlan === 'hard'}
                                  onClick={() => handleUpdatePlan(user.id, 'hard')}
                                  title="Weka Hard Plan (TZS 5,000)"
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-[#da7756]/15 hover:bg-[#da7756]/30 text-[#da7756] border border-[#da7756]/30 disabled:opacity-40 transition"
                                >
                                  + Hard
                                </button>
                                <button
                                  disabled={isUpdating || currentPlan === 'ultra'}
                                  onClick={() => handleUpdatePlan(user.id, 'ultra')}
                                  title="Weka Ultra Plan (VIP)"
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-purple-500/20 hover:bg-purple-500/35 text-purple-300 border border-purple-500/40 disabled:opacity-40 transition"
                                >
                                  + Ultra VIP
                                </button>
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
          </div>
        )}

        {/* 3. NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
            {/* Create Notification Form */}
            <div className="bg-[#181816] border border-[#2b2b28] rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#292926]">
                <div className="w-8 h-8 rounded-xl bg-[#da7756]/15 border border-[#da7756]/30 text-[#da7756] flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Tuma Taarifa (Push Notification)</h3>
                  <p className="text-[11px] text-neutral-400">
                    Taarifa itaonekana kwenye app kwa watumiaji wote mara moja
                  </p>
                </div>
              </div>

              <form onSubmit={handleSendNotification} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Kichwa cha Taarifa (Title):
                  </label>
                  <input
                    type="text"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="Mfano: Mfumo Mpya wa Video AI Umewashwa!"
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Ujumbe Kamili (Message):
                  </label>
                  <textarea
                    rows={4}
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    placeholder="Andika maelezo ya taarifa hapa..."
                    className="w-full bg-[#121211] border border-[#333330] focus:border-[#da7756] rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Walengwa wa Taarifa (Target Audience):
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
