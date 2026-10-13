import React from 'react';
import {
  Activity,
  ShieldAlert,
  KeyRound,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { soundManager } from '../utils/audio';

interface HeaderProps {
  latencyMs: number;
  isOnline: boolean;
  mode: 'simulation' | 'live';
  onToggleMode: (mode: 'simulation' | 'live') => void;
  onOpenApiModal: () => void;
  onOpenAiModal: () => void;
  onOpenLossAuditModal: () => void;
  onEmergencyKill: () => void;
  isApiConnected: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  autoScalpActive: boolean;
  totalAccountNetWorthUsd?: number;
  spotCashUsd?: number;
  realizedProfitUsd?: number;
}

export const Header: React.FC<HeaderProps> = ({
  latencyMs,
  isOnline,
  mode,
  onToggleMode,
  onOpenApiModal,
  onOpenAiModal,
  onOpenLossAuditModal,
  onEmergencyKill,
  isApiConnected,
  soundEnabled,
  onToggleSound,
  autoScalpActive,
  totalAccountNetWorthUsd,
  spotCashUsd,
  realizedProfitUsd,
}) => {
  return (
    <header className="border-b border-slate-800 bg-[#0d111a] px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1720px] mx-auto">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/10">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide text-white uppercase">
                  Bitfinex HFT Scalper
                </span>
                <span className="text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  SPOT v2.4
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>Sub-Second Microstructure Engine</span>
                <span className="text-slate-600">·</span>
                <span className="font-mono text-slate-300">Target $0.00004+ / 1-10s</span>
              </div>
            </div>
          </div>

          {/* Network Latency Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs">
            <div
              className={`w-2 h-2 rounded-full ${
                !isOnline
                  ? 'bg-rose-500 animate-pulse'
                  : latencyMs < 120
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-400">Bitfinex API:</span>
            <span
              className={`font-mono font-medium ${
                latencyMs < 120 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {isOnline ? `${latencyMs}ms` : 'OFFLINE'}
            </span>
          </div>

          {/* Real Bitfinex Balance & Post-Fee Net Profit Badge */}
          {totalAccountNetWorthUsd !== undefined && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-500/30 text-xs">
              <span className="text-slate-400 text-[11px] sm:text-xs">Real Balance:</span>
              <span className="font-mono font-bold text-emerald-400">
                ${totalAccountNetWorthUsd.toFixed(4)} USD
              </span>
              {realizedProfitUsd !== undefined && (
                <span
                  className={`text-[11px] font-mono font-bold border-l border-emerald-500/20 pl-1.5 ${
                    realizedProfitUsd >= 0 ? 'text-emerald-300' : 'text-rose-400'
                  }`}
                  title="Net profit after all Bitfinex Maker & Taker fees deducted"
                >
                  Real Profit: {realizedProfitUsd >= 0 ? '+' : ''}${Math.abs(realizedProfitUsd) < 0.0001 ? realizedProfitUsd.toFixed(6) : realizedProfitUsd.toFixed(4)}
                </span>
              )}
              {spotCashUsd !== undefined && (
                <span className="hidden md:inline text-[10px] font-mono text-slate-400 border-l border-emerald-500/20 pl-1.5">
                  Spot: ${spotCashUsd.toFixed(4)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Center: Mode Selector Segmented Control */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => onToggleMode('simulation')}
            className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${
              mode === 'simulation'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            Paper Trading (Zero-Risk)
          </button>
          <button
            onClick={() => {
              if (!isApiConnected) {
                onOpenApiModal();
              } else {
                onToggleMode('live');
              }
            }}
            className={`px-3 py-1 text-xs font-medium rounded transition-all flex items-center gap-1.5 ${
              mode === 'live'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                mode === 'live' ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
              }`}
            />
            Live Spot Trading
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* AI Advisor Button */}
          <button
            onClick={onOpenAiModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition-colors"
            title="Ask Gemini AI Market Microstructure Advisor"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">AI Microstructure</span>
          </button>

          {/* Real Account History & Loss Auditor Button */}
          <button
            onClick={onOpenLossAuditModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition-colors"
            title="Check real executed trades and fee/tax audit from your Bitfinex account"
          >
            <Search className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Audit Real History & Loss</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              onToggleSound();
              soundManager.toggle();
            }}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title={soundEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* API Key Connection */}
          <button
            onClick={onOpenApiModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              isApiConnected
                ? 'bg-slate-900 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isApiConnected ? 'API Keys Linked' : 'Connect Bitfinex'}
            </span>
            {isApiConnected ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </button>

          {/* Emergency Kill Switch */}
          <button
            onClick={onEmergencyKill}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border ${
              autoScalpActive
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-600/30 animate-pulse'
                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
            }`}
            title="Emergency halt bot execution and cancel any open orders immediately"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Kill Switch</span>
          </button>
        </div>
      </div>
    </header>
  );
};
