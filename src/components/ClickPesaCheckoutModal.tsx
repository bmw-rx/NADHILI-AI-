import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Zap,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface ClickPesaCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: 'normal' | 'hard' | 'ultra' | null;
  user: { id: string; name: string; email: string; plan: string } | null;
  token: string | null;
  onSuccess: (plan: string) => void;
  showToast: (msg: string) => void;
}

export const ClickPesaCheckoutModal: React.FC<ClickPesaCheckoutModalProps> = ({
  isOpen,
  onClose,
  plan,
  user,
  token,
  onSuccess,
  showToast,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [network, setNetwork] = useState<'mpesa' | 'tigo' | 'airtel' | 'halopesa'>('mpesa');
  const [loading, setLoading] = useState(false);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'push_sent' | 'success' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [diagnosticMessage, setDiagnosticMessage] = useState('');
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
      setStatusMessage('');
      setDiagnosticMessage('');
      setOrderRef(null);
      setLoading(false);
      setCountdown(60);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === 'push_sent' && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [status, countdown]);

  if (!isOpen || !plan) return null;

  const planInfo = {
    normal: {
      name: 'Plan ya Normal',
      amountTZS: 2000,
      amountUSD: 1,
      tag: 'Kawaida',
      badge: 'Fast & Code',
    },
    hard: {
      name: 'Plan ya Hard',
      amountTZS: 5000,
      amountUSD: 2,
      tag: 'Inayopendwa',
      badge: 'Code + Image Gen',
    },
    ultra: {
      name: 'Plan ya Ultra',
      amountTZS: 10000,
      amountUSD: 4,
      tag: 'VIP Ultimate',
      badge: 'Image + Bible AI + TTS',
    },
  }[plan];

  const handleSendUssdPush = async () => {
    const clean = phoneNumber.trim().replace(/[^0-9]/g, '');
    if (!clean) {
      showToast('Tafadhali weka nambari ya simu ya malipo.');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setStatusMessage('');

    try {
      const res = await fetch('/api/payments/ussd-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          plan,
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
        throw new Error(data.error || 'Haikuweza kuanzisha malipo ya USSD Push kwenye simu.');
      }

      setOrderRef(data.orderReference);
      setStatus('push_sent');
      setStatusMessage(data.message || 'USSD Push imetumwa! Angalia simu yako sasa.');
      showToast('Ombi la malipo limetumwa kwenye simu yako!');

      // Poll for verification
      startPolling(data.orderReference);
    } catch (err: any) {
      setStatus('failed');
      setStatusMessage(err.message || 'Hitilafu ya kuanzisha USSD Push');
      showToast(err.message || 'Hitilafu ya malipo');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (ref: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 20) {
        clearInterval(interval);
        return;
      }

      try {
        const res = await fetch(`/api/payments/status/${ref}`);
        if (res.ok) {
          const raw = await res.text();
          let data: any = {};
          try {
            data = JSON.parse(raw);
          } catch {}

          if (data.status === 'SUCCESS') {
            clearInterval(interval);
            setStatus('success');
            setStatusMessage('Hongera! Malipo yamethibitishwa na mpango wako umeboreshwa!');
            showToast(`Mpango wako umeanza kutumika: ${plan.toUpperCase()}`);
            onSuccess(plan);
          } else if (data.status === 'FAILED') {
            clearInterval(interval);
            setStatus('failed');
            setStatusMessage('Malipo yameshindikana au mtumiaji ameghairi kwenye simu.');
          }
        }
      } catch {}
    }, 3000);
  };

  const handleInstantActivate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/upgrade-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          plan,
          orderRef,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setStatusMessage(`Mpango wa ${plan.toUpperCase()} umewashwa kikamilifu!`);
        showToast(`Hongera! Mpango wa ${plan.toUpperCase()} umewashwa!`);
        onSuccess(plan);
      } else {
        showToast(data.error || 'Haikuweza kuwezesha mpango.');
      }
    } catch {
      showToast('Hitilafu ya kuwezesha mpango');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#1b1b19] border border-[#33332f] rounded-3xl max-w-md w-full p-6 text-neutral-200 relative shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2d2d29] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#da7756] to-[#eb947a] text-white flex items-center justify-center font-bold text-sm shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Lipa kwa Simu (USSD Push)
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                  Papo Hapo & Salama
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">Malipo salama ya haraka kwa simu yako</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-[#282824] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Plan Summary Card */}
        <div className="bg-[#242420] border border-[#383834] rounded-2xl p-4 mb-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{planInfo.name}</span>
              <span className="text-[10px] bg-[#da7756]/20 text-[#da7756] px-2 py-0.5 rounded-full font-mono">
                {planInfo.tag}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">{planInfo.badge}</p>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-[#ede8dd]">
              TZS {planInfo.amountTZS.toLocaleString()}
            </span>
            <p className="text-[10px] text-neutral-400">kwa mwezi</p>
          </div>
        </div>

        {/* Status: Push Sent Waiting for PIN */}
        {status === 'push_sent' && (
          <div className="bg-[#1f1e1a] border border-amber-500/30 rounded-2xl p-5 mb-5 text-center space-y-3 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Smartphone className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Angalia Skrini ya Simu Yako Sasa!</h4>
              <p className="text-xs text-neutral-300 mt-1.5 leading-relaxed">
                Ombi la USSD Push limetumwa kwenda nambari <strong className="text-white">{phoneNumber}</strong>.
                Tafadhali ingiza PIN yako ya siri kukamilisha malipo.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-amber-400 font-mono pt-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Inasubiri uthibitisho ({countdown}s)...</span>
            </div>
            {orderRef && (
              <p className="text-[10px] text-neutral-500 font-mono">Order Ref: {orderRef}</p>
            )}

            <div className="pt-2 border-t border-[#33332c] flex flex-col gap-2">
              <button
                type="button"
                onClick={handleInstantActivate}
                disabled={loading}
                className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold rounded-xl transition shadow-md flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Thibitisha Malipo Papo Hapo (Activate Now)</span>
              </button>
            </div>
          </div>
        )}

        {/* Status: Success */}
        {status === 'success' && (
          <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-5 mb-5 text-center space-y-3 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Malipo Yamekamilika Kikamilifu!</h4>
              <p className="text-xs text-emerald-300/90 mt-1">
                Akaunti yako imeboreshwa kuwa <strong>{plan.toUpperCase()}</strong>. Unaweza sasa kufurahia huduma zote za akili bandia bila kikomo.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-gradient-to-r from-[#da7756] to-[#eb947a] text-white text-xs font-bold rounded-xl shadow-lg transition"
            >
              Anza Kutumia {planInfo.name} Sasa
            </button>
          </div>
        )}

        {/* Status: Failed */}
        {status === 'failed' && (
          <div className="bg-red-950/40 border border-red-500/40 rounded-2xl p-4 mb-5 text-left space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2.5 text-red-400">
              <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Kwanini Malipo Hayajaja Kwenye Simu?</h4>
                <p className="text-[10px] text-red-300 font-mono">Hitilafu ya USSD Push</p>
              </div>
            </div>

            <div className="bg-black/40 border border-red-900/50 rounded-xl p-3 text-xs text-red-200 leading-relaxed space-y-1.5">
              <p className="font-semibold text-white">Sababu:</p>
              <p className="text-red-300">{statusMessage || 'Hitilafu ya kuwasiliana na mfumo wa malipo.'}</p>
              {diagnosticMessage && (
                <div className="pt-2 border-t border-red-900/40 text-[11px] text-neutral-300">
                  <span className="font-semibold text-amber-400">Ufafanuzi: </span>
                  {diagnosticMessage}
                </div>
              )}
            </div>

            <div className="bg-[#1e1e1a] border border-[#33332e] rounded-xl p-2.5 text-[11px] text-neutral-300 space-y-1">
              <p className="font-semibold text-neutral-200">Kagua mambo yafuatayo:</p>
              <ul className="list-disc list-inside space-y-0.5 text-neutral-400 text-[10px]">
                <li>Hakikisha nambari ya simu ({phoneNumber || '07XXXXXXXX'}) ipo hewani.</li>
                <li>Ikiwa funguo za ClickPesa hazijawekwa, admin anapaswa kuziweka kwenye Admin Panel.</li>
                <li>Unaweza pia kutumia uthibitisho wa moja kwa moja hapa chini:</li>
              </ul>
            </div>

            <div className="pt-1 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleInstantActivate}
                disabled={loading}
                className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shadow"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Washa Mpango Mara Moja (Jaribio)</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('idle')}
                className="py-2 px-3 bg-[#262623] hover:bg-[#30302b] text-neutral-300 text-xs font-medium rounded-xl transition"
              >
                Badili Namba / Jaribu Tena
              </button>
            </div>
          </div>
        )}

        {/* Input Form (Only if not already success or waiting) */}
        {status !== 'success' && status !== 'push_sent' && (
          <div className="space-y-4">
            {/* Network Selector */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-2">
                Chagua Mtandao wa Simu:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'mpesa', name: 'M-Pesa', desc: 'Vodacom Tanzania', color: 'border-red-500/50' },
                  { id: 'tigo', name: 'Tigo Pesa', desc: 'Mixx by Yas', color: 'border-yellow-500/50' },
                  { id: 'airtel', name: 'Airtel Money', desc: 'Airtel Tanzania', color: 'border-red-500/50' },
                  { id: 'halopesa', name: 'HaloPesa', desc: 'Halotel Tanzania', color: 'border-orange-500/50' },
                ].map((net) => {
                  const isSel = network === net.id;
                  return (
                    <button
                      key={net.id}
                      type="button"
                      onClick={() => setNetwork(net.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        isSel
                          ? 'bg-[#da7756]/15 border-[#da7756] text-white shadow-sm'
                          : 'bg-[#222220] border-[#33332f] text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <p className="text-xs font-semibold flex items-center justify-between">
                        {net.name}
                        {isSel && <span className="w-1.5 h-1.5 rounded-full bg-[#da7756]" />}
                      </p>
                      <p className="text-[10px] text-neutral-500">{net.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Phone Number Input */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Nambari ya Simu ya Malipo:
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="07XXXXXXXX au 2557XXXXXXXX"
                  className="w-full bg-[#121211] border border-[#33332f] focus:border-[#da7756] focus:outline-none rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 transition font-mono"
                />
                <span className="absolute right-3 top-3 text-[10px] text-neutral-500 font-mono">
                  TZ (+255)
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">
                Utapokea ujumbe wa USSD kwenye simu hii ukikwambia uweke PIN.
              </p>
            </div>

            {/* Pay Button */}
            <button
              type="button"
              onClick={handleSendUssdPush}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#da7756] to-[#eb947a] hover:from-[#e38161] hover:to-[#f09f87] text-white text-sm font-bold rounded-2xl shadow-xl transition flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Inatuma USSD Push...</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />
                  <span>Lipa TZS {planInfo.amountTZS.toLocaleString()} kwa USSD</span>
                </>
              )}
            </button>

            {/* Test Simulation Activation Helper for instant testing */}
            <div className="pt-2 border-t border-[#292926] text-center">
              <button
                type="button"
                onClick={handleInstantActivate}
                disabled={loading}
                className="text-[11px] text-neutral-400 hover:text-white underline transition"
              >
                Jaribu / Washa Mpango Moja kwa Moja (Test Mode Activation)
              </button>
            </div>
          </div>
        )}

        {/* Security Footer */}
        <div className="mt-4 pt-3 border-t border-[#282824] flex items-center justify-between text-[10px] text-neutral-500">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            256-Bit SSL Encrypted
          </span>
          <span>Malipo Salama ya Simu (Tanzania)</span>
        </div>
      </div>
    </div>
  );
};
