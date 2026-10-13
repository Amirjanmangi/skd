import React, { useState } from 'react';
import {
  KeyRound,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Wallet,
  ShieldCheck,
  Zap,
  Lock,
  ChevronDown,
  ChevronUp,
  Globe,
  ArrowRightLeft,
} from 'lucide-react';
import { api } from '../services/api';
import { BotConfig, SpotWallet } from '../types/trading';

interface ApiConnectionBannerProps {
  config: BotConfig;
  onUpdateConfig: (newConfig: Partial<BotConfig>) => void;
  spotWallets: SpotWallet[];
  setSpotWallets: (wallets: SpotWallet[]) => void;
  serverIp: string;
  onLog: (type: 'INFO' | 'SIGNAL' | 'EXECUTION' | 'PROFIT' | 'WARNING' | 'ERROR', msg: string) => void;
}

export const ApiConnectionBanner: React.FC<ApiConnectionBannerProps> = ({
  config,
  onUpdateConfig,
  spotWallets,
  setSpotWallets,
  serverIp,
  onLog,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(config.apiKey || '');
  const [apiSecretInput, setApiSecretInput] = useState(config.apiSecret || '');
  const [copiedIp, setCopiedIp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(Boolean(config.apiKey && config.apiSecret));

  const [fundingWallets, setFundingWallets] = useState<SpotWallet[]>([]);
  const [marginWallets, setMarginWallets] = useState<SpotWallet[]>([]);

  const isConnected = Boolean(config.apiKey && config.apiSecret);

  // Check USDT in funding / margin
  const fundingUsdt = fundingWallets.find((w) => ['UST', 'USDT'].includes(w.currency.toUpperCase()))?.available || 0;
  const marginUsdt = marginWallets.find((w) => ['UST', 'USDT'].includes(w.currency.toUpperCase()))?.available || 0;
  const exchangeUsdt = spotWallets.find((w) => ['UST', 'USDT'].includes(w.currency.toUpperCase()))?.available || 0;
  const hasUsdtInOtherWallets = (fundingUsdt > 0 || marginUsdt > 0) && exchangeUsdt <= 0.05;

  const handleCopyIp = () => {
    navigator.clipboard.writeText(serverIp || '34.96.39.52');
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  const handleTransferToExchange = async () => {
    const fromWallet = fundingUsdt > 0 ? 'funding' : 'margin';
    const amountToMove = fundingUsdt > 0 ? fundingUsdt : marginUsdt;
    if (amountToMove <= 0) return;

    setTransferring(true);
    try {
      onLog('INFO', `Transferring ${amountToMove} USDT from ${fromWallet} to Exchange (Spot) wallet...`);
      const res = await api.transferWalletFunds({
        apiKey: config.apiKey || apiKeyInput.trim(),
        apiSecret: config.apiSecret || apiSecretInput.trim(),
        from: fromWallet,
        to: 'exchange',
        currency: 'UST',
        amount: amountToMove,
      });

      if (res.success) {
        onLog('INFO', `✅ Successfully transferred ${amountToMove} USDT to Exchange Spot wallet! Ready for spot trading.`);
        setSuccessMsg(`Transferred ${amountToMove} USDT to Exchange Spot wallet!`);
        // Refresh wallets
        const refreshed = await api.getSpotWallets(config.apiKey || apiKeyInput.trim(), config.apiSecret || apiSecretInput.trim());
        if (refreshed.spotWallets) setSpotWallets(refreshed.spotWallets);
        if ((refreshed as any).fundingWallets) setFundingWallets((refreshed as any).fundingWallets);
        if ((refreshed as any).marginWallets) setMarginWallets((refreshed as any).marginWallets);
      } else {
        setErrorMsg(res.error || 'Transfer failed. Check API key permissions.');
        onLog('ERROR', `Wallet transfer failed: ${res.error}`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const handleConnect = async () => {
    if (!apiKeyInput.trim() || !apiSecretInput.trim()) {
      setErrorMsg('Please enter both Bitfinex API Key and API Secret.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Auto-sweep any USDT sitting in Funding or Margin to Exchange Spot wallet!
      try {
        const prep = await api.autoPrepareUsdt(apiKeyInput.trim(), apiSecretInput.trim());
        if (prep.actionsTaken && prep.actionsTaken.length > 0) {
          prep.actionsTaken.forEach((act) => onLog('INFO', `✅ ${act}`));
        }
      } catch (_) {}

      const res = await api.validateApiCredentials(apiKeyInput.trim(), apiSecretInput.trim());
      if (res.success) {
        if (res.fundingWallets) setFundingWallets(res.fundingWallets);
        if (res.marginWallets) setMarginWallets(res.marginWallets);

        // Check balances
        const ustFunding = res.fundingWallets?.find(w => ['UST', 'USDT'].includes(w.currency.toUpperCase()))?.available || 0;
        const ustMargin = res.marginWallets?.find(w => ['UST', 'USDT'].includes(w.currency.toUpperCase()))?.available || 0;
        let ustEx = res.exchangeWallets?.find(w => ['UST', 'USDT'].includes(w.currency.toUpperCase()))?.available || 0;
        const usdEx = res.exchangeWallets?.find(w => w.currency.toUpperCase() === 'USD')?.available || 0;

        // Auto-transfer to Exchange if needed
        if (ustEx <= 0.05 && (ustFunding > 0 || ustMargin > 0)) {
          const fromW = ustFunding > 0 ? 'funding' : 'margin';
          const amt = ustFunding > 0 ? ustFunding : ustMargin;
          onLog('INFO', `Detected ${amt} USDT in ${fromW} wallet. Auto-transferring to Exchange Spot wallet...`);
          try {
            const transferRes = await api.transferWalletFunds({
              apiKey: apiKeyInput.trim(),
              apiSecret: apiSecretInput.trim(),
              from: fromW,
              to: 'exchange',
              currency: 'UST',
              amount: amt,
            });
            if (transferRes.success) {
              ustEx = amt;
              onLog('INFO', `✅ Auto-transfer complete: ${amt} USDT moved to Exchange Spot wallet!`);
            }
          } catch (tErr) {
            console.error('Transfer attempt:', tErr);
          }
        }

        const detectedQuote: 'USD' | 'UST' = usdEx > 0 && ustEx <= 0 && ustFunding <= 0 ? 'USD' : 'UST';

        onUpdateConfig({
          apiKey: apiKeyInput.trim(),
          apiSecret: apiSecretInput.trim(),
          mode: 'live', // LIVE SPOT TRADING ACTIVATED
          quoteCurrency: detectedQuote,
          symbol: detectedQuote === 'UST' ? 'tAVAX:UST' : 'tAVAX:USD', // AVAX has lowest minimum (~$0.85) to fit $1-$3 balances!
          autoScalpActive: false, // Let user review settings before starting
          continuousMode: true,
          targetProfitUsd: 0.00004,
          targetProfitPercent: 0.004,
          zeroFeeMode: false, // Real Bitfinex Fee Guard active!
          enforceFeeGuard: true,
          strictZeroLossStop: true,
          strictNoLoss: true,
          buyOnDipOnly: true,
        });

        if (res.exchangeWallets) {
          setSpotWallets(res.exchangeWallets);
        }

        setSuccessMsg(
          `Connected to Bitfinex! Active Wallet: ${detectedQuote}. LIVE SPOT TRADING ACTIVATED!`
        );
        onLog('INFO', `Bitfinex API authenticated successfully! LIVE SPOT TRADING ACTIVATED on ${detectedQuote}.`);
        setCollapsed(true);
      } else {
        setErrorMsg(
          res.error || 'Connection failed. Verify API Key, Secret, and Bitfinex IP Whitelist.'
        );
        onLog('ERROR', `Bitfinex API Connection rejected: ${res.error}`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error connecting to Bitfinex.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    onUpdateConfig({ apiKey: '', apiSecret: '', mode: 'simulation', autoScalpActive: false });
    setApiKeyInput('');
    setApiSecretInput('');
    setSpotWallets([]);
    setFundingWallets([]);
    setMarginWallets([]);
    setSuccessMsg(null);
    setErrorMsg(null);
    setCollapsed(false);
    onLog('INFO', 'Bitfinex API credentials cleared.');
  };

  return (
    <div className="bg-[#0f1420] border-b border-slate-800 px-4 py-3">
      <div className="max-w-[1720px] mx-auto">
        {/* Main Status & Toggle Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm ${
                isConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              <KeyRound className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Bitfinex API & USDT Live Spot Connection</span>
                {isConnected ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    AUTHENTICATED
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                    NOT CONNECTED · ENTER KEYS BELOW
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isConnected
                  ? `Live Spot trading authenticated on ${config.quoteCurrency}. Real orders executing on Bitfinex.`
                  : 'Bitfinex API connect karein taake bot real USDT spot trades laga kar profit kare.'}
              </p>
            </div>
          </div>

          {/* Quick Controls: Mode Switcher, Zero-Fee & Zero-Loss Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Spot vs Paper Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              <button
                onClick={() => onUpdateConfig({ mode: 'simulation' })}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  config.mode === 'simulation'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Paper Sim
              </button>
              <button
                onClick={() => {
                  if (!isConnected) {
                    setCollapsed(false);
                  } else {
                    onUpdateConfig({ mode: 'live', autoScalpActive: true });
                  }
                }}
                className={`px-2.5 py-1 rounded font-bold transition-all flex items-center gap-1.5 ${
                  config.mode === 'live'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${config.mode === 'live' ? 'bg-white animate-ping' : 'bg-slate-600'}`} />
                <span>LIVE SPOT</span>
              </button>
            </div>

            {/* Zero Fee Toggle */}
            <button
              onClick={() => onUpdateConfig({ zeroFeeMode: !config.zeroFeeMode })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 transition-all border ${
                config.zeroFeeMode
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Zero Fee Mode: 0% exchange fees deducted"
            >
              <Zap className={`w-3.5 h-3.5 ${config.zeroFeeMode ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>Zero-Fee: {config.zeroFeeMode ? '0.00% (ON)' : 'STD'}</span>
            </button>

            {/* Strict Zero-Loss Toggle */}
            <button
              onClick={() => onUpdateConfig({ strictZeroLossStop: !config.strictZeroLossStop })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 transition-all border ${
                config.strictZeroLossStop
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm shadow-blue-500/10'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Ensure trades never exit in negative loss"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${config.strictZeroLossStop ? 'text-blue-400' : 'text-slate-500'}`} />
              <span>Zero-Loss: {config.strictZeroLossStop ? 'STRICT' : 'OFF'}</span>
            </button>

            {/* Expand / Collapse Button */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors flex items-center gap-1"
            >
              <span>{collapsed ? 'Edit Keys / Wallets' : 'Hide Setup'}</span>
              {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* USDT in Other Wallets Notification Banner */}
        {hasUsdtInOtherWallets && (
          <div className="mt-3 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-200">
              <ArrowRightLeft className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Wallet Alert:</strong> Aapka{' '}
                <strong className="text-white">{(fundingUsdt > 0 ? fundingUsdt : marginUsdt).toFixed(2)} USDT</strong>{' '}
                '{fundingUsdt > 0 ? 'Funding (Lending)' : 'Margin'}' wallet mein hai. Spot trading ke liye isay Exchange Spot wallet mein transfer karein:
              </span>
            </div>
            <button
              onClick={handleTransferToExchange}
              disabled={transferring}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              {transferring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
              <span>Transfer to Exchange Spot (Instant 0% Fee)</span>
            </button>
          </div>
        )}

        {/* Expandable Form & IP Whitelist Card */}
        {!collapsed && (
          <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-3">
            {/* 1. Server IP Whitelist Help Strip */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Globe className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span>Server Outbound IP Address for Bitfinex Whitelist:</span>
                    <span className="font-mono text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                      {serverIp || '34.96.39.52'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    <strong>Critical:</strong> Bitfinex API key banate waqt <em>"IP Whitelist"</em> field ko ya to{' '}
                    <strong className="text-amber-300">KHALI (Empty)</strong> chhor dein, ya phir yeh Server IP paste karein.
                  </p>
                </div>
              </div>

              <button
                onClick={handleCopyIp}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-cyan-300 flex items-center gap-1.5 transition-colors self-start md:self-auto"
              >
                {copiedIp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedIp ? 'Copied to Clipboard!' : 'Copy Server IP'}</span>
              </button>
            </div>

            {/* 2. Direct API Key & Secret Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Bitfinex API Key (Orders Read/Write & Wallets Read)
                </label>
                <input
                  type="text"
                  placeholder="Paste your Bitfinex API Key"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Bitfinex API Secret
                </label>
                <input
                  type="password"
                  placeholder="Paste your Bitfinex API Secret"
                  value={apiSecretInput}
                  onChange={(e) => setApiSecretInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="md:col-span-3 flex items-center gap-2">
                <button
                  onClick={handleConnect}
                  disabled={loading}
                  className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Connect & Start Live</span>
                    </>
                  )}
                </button>

                {isConnected && (
                  <button
                    onClick={handleDisconnect}
                    className="py-2 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-medium transition-colors"
                    title="Disconnect and clear keys"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            {/* Error or Success alerts */}
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="space-y-1">
                  <div className="font-semibold text-rose-200">Connection Error / Rabta Na Ho Saka:</div>
                  <div className="leading-relaxed">{errorMsg}</div>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Connected Wallets breakdown display */}
            <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                Exchange (Spot):
              </span>
              {spotWallets.length === 0 ? (
                <span className="text-slate-500 text-[11px]">No exchange spot balances loaded</span>
              ) : (
                spotWallets.map((w) => (
                  <div
                    key={`spot-${w.currency}`}
                    className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]"
                  >
                    <span className="text-emerald-400 font-bold">{w.currency}:</span>{' '}
                    <span className="text-white">{w.available.toFixed(4)}</span>
                  </div>
                ))
              )}

              {/* Funding wallet if present */}
              {fundingUsdt > 0 && (
                <div className="px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/40 text-[11px]">
                  <span className="text-amber-400 font-bold">Funding UST:</span>{' '}
                  <span className="text-white">{fundingUsdt.toFixed(2)}</span>
                </div>
              )}

              {/* Margin wallet if present */}
              {marginUsdt > 0 && (
                <div className="px-2 py-0.5 rounded bg-blue-950/40 border border-blue-500/40 text-[11px]">
                  <span className="text-blue-400 font-bold">Margin UST:</span>{' '}
                  <span className="text-white">{marginUsdt.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
