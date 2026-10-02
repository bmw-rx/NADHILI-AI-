import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Crown,
  Sparkles,
  Zap,
  ShieldCheck,
  Smartphone,
  BookOpen,
  Volume2,
  Palette,
  Code2,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';

interface PlansPageProps {
  user: { id: string; name: string; email: string; plan: string } | null;
  onBackToChat: () => void;
  onSelectPlan: (plan: 'normal' | 'hard' | 'ultra') => void;
}

export const PlansPage: React.FC<PlansPageProps> = ({ user, onBackToChat, onSelectPlan }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const currentPlan = (user?.plan || 'free').toLowerCase();

  return (
    <div className="min-h-screen bg-[#141413] text-[#ede8dd] flex flex-col selection:bg-[#da7756]/30 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-[#242421] bg-[#171715]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <button
          onClick={onBackToChat}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-300 hover:text-white px-3 py-1.5 rounded-xl bg-[#222220] hover:bg-[#2b2b27] border border-[#33332f] transition"
        >
          <ArrowLeft className="w-4 h-4 text-[#da7756]" />
          <span>Rudi kwenye Gumzo (Chat)</span>
        </button>

        {/* Brand Center */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#da7756] to-[#eb947a] text-white flex items-center justify-center font-serif font-bold text-xs shadow-md">
            N
          </div>
          <span className="font-semibold text-sm tracking-wide text-white">NADHILI AI</span>
        </div>

        {/* Current Plan Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 hidden sm:inline">Mpango wako:</span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#da7756]/15 text-[#da7756] border border-[#da7756]/30 uppercase font-mono">
            {currentPlan}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 space-y-12">
        {/* Hero Title & Subtitle */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold bg-[#da7756]/10 text-[#da7756] border border-[#da7756]/25">
            <Crown className="w-3.5 h-3.5" />
            <span>Mipango ya Kulipia (Pricing & Plans)</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif font-normal text-white tracking-tight">
            Chagua Mpango wa NADHILI AI
          </h1>

          <p className="text-sm text-neutral-400 leading-relaxed">
            Pata uwezo wa juu wa Akili Bandia nchini Tanzania na Afrika Mashariki. Lipa kwa urahisi kwa
            kutumia <strong>Vodacom M-Pesa, Tigo Pesa, Airtel Money, au HaloPesa</strong> kupitia USSD Push ya simu yako.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="pt-3 flex items-center justify-center">
            <div className="bg-[#1f1f1d] border border-[#2e2e2a] p-1 rounded-2xl flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-xl font-medium transition ${
                  billingCycle === 'monthly'
                    ? 'bg-[#da7756] text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Malipo ya Kila Mwezi
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-[#da7756] text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span>Mwaka mzima</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-mono">
                  -20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 3 Interactive Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {/* 1. PLAN YA NORMAL */}
          <div
            className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition border relative ${
              currentPlan === 'normal'
                ? 'bg-[#1e1e1b] border-emerald-500/50 shadow-xl'
                : 'bg-[#1b1b19] border-[#2d2d29] hover:border-[#3e3e38]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300 font-mono">
                  Kawaida
                </span>
                {currentPlan === 'normal' && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                    Mpango Wako
                  </span>
                )}
              </div>

              <h3 className="text-xl font-serif font-bold text-white mb-1">Plan ya Normal</h3>
              <p className="text-xs text-neutral-400 mb-6">
                Inafaa wanafunzi na kazi za kila siku za uandishi, tafiti na utatuzi wa haraka.
              </p>

              {/* Price */}
              <div className="mb-6 pb-6 border-b border-[#2a2a26]">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">
                    TZS {billingCycle === 'monthly' ? '2,000' : '20,000'}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">
                    /{billingCycle === 'monthly' ? 'mwezi' : 'mwaka'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">Kuanzia TZS 2,000 tu kwa mwezi</p>
              </div>

              {/* Features List */}
              <div className="space-y-3 mb-8 text-xs text-neutral-300">
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Fast Answer:</strong> Majibu ya papo hapo kwa sekunde
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Unlimited Chatbot:</strong> Mazungumzo yasiyo na kikomo cha maswali
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Code Intelligence:</strong> Kuandika, kusahihisha na kuelezea programu (HTML, CSS, JS, Python, SQL)
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Uwezo wa kuambatanisha faili za PDF na maelezo</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectPlan('normal')}
              className={`w-full py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md ${
                currentPlan === 'normal'
                  ? 'bg-[#292925] text-neutral-200 border border-[#3b3b36] hover:bg-[#33332e]'
                  : 'bg-[#262623] hover:bg-[#33332f] text-white border border-[#3d3d37]'
              }`}
            >
              <span>{currentPlan === 'normal' ? 'Umesajiliwa Tayari' : 'Chagua Plan ya Normal'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2. PLAN YA HARD (PRO) - HIGHLIGHTED */}
          <div
            className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition border relative scale-[1.02] shadow-2xl ${
              currentPlan === 'hard'
                ? 'bg-[#201d19] border-[#da7756]'
                : 'bg-gradient-to-b from-[#221f1c] to-[#1a1917] border-[#da7756]/60 shadow-[0_0_30px_rgba(218,119,86,0.15)]'
            }`}
          >
            {/* Popular Ribbon */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#da7756] to-[#eb947a] text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Inayopendwa Zaidi</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#da7756]/20 text-[#da7756] font-mono">
                  Pro / Hard
                </span>
                {currentPlan === 'hard' && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                    Mpango Wako
                  </span>
                )}
              </div>

              <h3 className="text-xl font-serif font-bold text-white mb-1">Plan ya Hard</h3>
              <p className="text-xs text-neutral-300 mb-6">
                Kwa waendelezaji programu, waundaji maudhui na wataalamu wanaohitaji picha za kiwango cha juu.
              </p>

              {/* Price */}
              <div className="mb-6 pb-6 border-b border-[#36322d]">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-[#ede8dd]">
                    TZS {billingCycle === 'monthly' ? '5,000' : '50,000'}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">
                    /{billingCycle === 'monthly' ? 'mwezi' : 'mwaka'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">Takriban $2 USD kwa mwezi</p>
              </div>

              {/* Features List */}
              <div className="space-y-3 mb-8 text-xs text-neutral-200">
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#da7756] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Chat Unlimited:</strong> Mazungumzo marefu ya kimkakati bila kizuizi
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#da7756] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Advanced Code:</strong> Uundaji kamili wa tovuti, API na database (Deep reasoning)
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#da7756] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Create Image (NADHILI IGLAM):</strong> Tengeneza picha za kisasa za Ideogram AI zenye vitufe vya Download, Share na Edit
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#da7756] shrink-0 mt-0.5" />
                  <span>Kasi ya upendeleo (Priority High-Speed Server)</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectPlan('hard')}
              className="w-full py-3 bg-gradient-to-r from-[#da7756] to-[#eb947a] hover:from-[#e38161] hover:to-[#f09f87] text-white text-xs font-bold rounded-2xl shadow-xl transition flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <span>{currentPlan === 'hard' ? 'Boresha Upya' : 'Chagua Plan ya Hard'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3. PLAN YA ULTRA (VIP ULTIMATE) */}
          <div
            className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition border relative ${
              currentPlan === 'ultra'
                ? 'bg-[#1e1b24] border-purple-500/60 shadow-xl'
                : 'bg-[#1b1920] border-[#362e42] hover:border-purple-500/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                  VIP Ultimate
                </span>
                {currentPlan === 'ultra' && (
                  <span className="text-[10px] bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full font-bold">
                    Mpango Wako
                  </span>
                )}
              </div>

              <h3 className="text-xl font-serif font-bold text-white mb-1">Plan ya Ultra</h3>
              <p className="text-xs text-neutral-400 mb-6">
                Kila kitu kimefunguliwa! Inajumuisha picha, uchambuzi wa Maandiko ya Biblia, na sauti ya TTS.
              </p>

              {/* Price */}
              <div className="mb-6 pb-6 border-b border-[#2d2638]">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">
                    TZS {billingCycle === 'monthly' ? '10,000' : '90,000'}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">
                    /{billingCycle === 'monthly' ? 'mwezi' : 'mwaka'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">Takriban $4 USD kwa mwezi</p>
              </div>

              {/* Features List */}
              <div className="space-y-3 mb-8 text-xs text-neutral-200">
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Unlimited Chatbot:</strong> Kila model ya lugha bila kikomo chochote
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Create Image (NADHILI IGLAM):</strong> Picha zisizo na kikomo, zenye ubora wa 4K
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">Bible AI:</strong> Ushauri wa kina wa kiteolojia, vifungu na mafundisho ya Maandiko Matakatifu
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-white">TTS (Text to Speech):</strong> Kubadili maandishi kuwa sauti asilia yenye kicheza sauti na kupakua MP3
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>Msaada wa kipaumbele wa VIP 24/7 & Upatikanaji wa models zote mpya</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectPlan('ultra')}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-2xl shadow-xl transition flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <span>{currentPlan === 'ultra' ? 'Mpango Unaoendelea' : 'Chagua Plan ya Ultra'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Payment Partner Banner */}
        <div className="bg-[#1b1b19] border border-[#2d2d29] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#da7756]/15 border border-[#da7756]/30 flex items-center justify-center text-[#da7756] shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                Malipo Rahisi Kupitia USSD Push ya Simu (Mobile Money)
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                  Tanzania
                </span>
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Hakuna kadi ya benki inayohitajika. Chagua mpango, ingiza namba yako ya M-Pesa, Tigo Pesa, Airtel Money au HaloPesa, na uthibitishwe kwa sekunde chache.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-300">
            <span className="px-3 py-1.5 rounded-xl bg-[#242421] border border-[#33332f]">Vodacom M-Pesa</span>
            <span className="px-3 py-1.5 rounded-xl bg-[#242421] border border-[#33332f]">Tigo Pesa</span>
            <span className="px-3 py-1.5 rounded-xl bg-[#242421] border border-[#33332f]">Airtel Money</span>
            <span className="px-3 py-1.5 rounded-xl bg-[#242421] border border-[#33332f]">HaloPesa</span>
          </div>
        </div>
      </main>
    </div>
  );
};
