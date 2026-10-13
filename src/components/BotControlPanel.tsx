import React, { useState } from 'react';
import {
  Play,
  Square,
  Zap,
  Sliders,
  DollarSign,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Percent,
} from 'lucide-react';
import { BotConfig, HftSignals, SpotWallet } from '../types/trading';
import { BITFINEX_COIN_SPECS } from '../utils/hftMath';

interface BotControlPanelProps {
  config: BotConfig;
  onUpdateConfig: (newConfig: Partial<BotConfig>) => void;
  onManualTrigger: () => void;
  signals: HftSignals;
  isPositionOpen: boolean;
  spotWallets: SpotWallet[];
}

export const BotControlPanel: React.FC<BotControlPanelProps> = ({
  config,
  onUpdateConfig,
  onManualTrigger,
  signals,
  isPositionOpen,
  spotWallets,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Find USD or USDT balance if available
  const usdWallet = spotWallets.find((w) => w.currency.toUpperCase() === 'USD');
  const ustWallet = spotWallets.find((w) => ['UST', 'USDT'].includes(w.currency.toUpperCase()));
  const usdCash = usdWallet ? Math.max(usdWallet.available, usdWallet.balance) : 0;
  const ustCash = ustWallet ? Math.max(ustWallet.available, ustWallet.balance) : 0;
  const availableUsd = usdCash > 0 ? usdCash : ustCash;

  return (
    <div className="bg-[#0f1420] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
      <div>
        {/* Title & Quick Stats */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">Bot Execution Controls</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                config.autoScalpActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {config.autoScalpActive ? 'RUNNING AUTOMATED' : 'IDLE / MANUAL'}
            </span>
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showAdvanced ? 'Hide Settings' : 'Tune Thresholds'}</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Continuous Mode & Autonomous Coin Hunter Ribbon */}
        <div className="mt-2.5 p-2 rounded-lg bg-slate-950/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs">
            <Zap className={`w-3.5 h-3.5 ${config.continuousMode ? 'text-amber-400' : 'text-slate-500'}`} />
            <span className="text-slate-300 font-medium">Execution Engine:</span>
            <span className={`font-mono font-bold text-[11px] ${config.continuousMode ? 'text-emerald-400' : 'text-slate-400'}`}>
              {config.continuousMode ? '⚡ CONTINUOUS RAPID (1s Loop)' : '🎯 STRICT CONFLUENCE'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateConfig({ multiCoinHunter: !config.multiCoinHunter })}
              className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                config.multiCoinHunter
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
              title="When enabled, bot automatically switches away from dumping coins to the coin with aggressive buyers and highest 2-3 min profit edge"
            >
              {config.multiCoinHunter ? '🎯 Auto-Hunt: Best Buyers Coin' : '🔒 Locked to Current Coin'}
            </button>

            <button
              onClick={() => onUpdateConfig({ continuousMode: !config.continuousMode })}
              className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                config.continuousMode
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              {config.continuousMode ? 'Mode: Continuous' : 'Mode: Strict'}
            </button>
          </div>
        </div>

        {/* Spot Wallet Balance & Tradable Coins Indicator */}
        <div className="mt-2.5 p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Available Spot Balance:</span>
            </span>
            <span className="font-mono font-bold text-emerald-400 text-xs">
              ${availableUsd.toFixed(4)} {usdWallet?.currency || 'USDT'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-800/60 text-[10px] font-mono">
            <span className="text-slate-500">Tradable coins:</span>
            {Object.values(BITFINEX_COIN_SPECS).map((c) => {
              const isCur = config.symbol.toUpperCase().includes(c.cleanSymbol);
              const fits = availableUsd === 0 || availableUsd >= c.minApproxUsd * 0.95;
              return (
                <button
                  key={c.cleanSymbol}
                  onClick={() => onUpdateConfig({ symbol: config.quoteCurrency === 'UST' ? c.ustSymbol : c.usdSymbol })}
                  className={`px-1.5 py-0.5 rounded transition-all ${
                    isCur
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 font-bold'
                      : fits
                      ? 'bg-slate-900 text-slate-300 hover:text-white border border-slate-700'
                      : 'bg-slate-950 text-slate-600 border border-slate-900 line-through'
                  }`}
                  title={`${c.cleanSymbol}: Min ~$${c.minApproxUsd.toFixed(2)}`}
                >
                  {c.cleanSymbol} (${c.minApproxUsd.toFixed(1)})
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
          {/* 1. Auto Scalper Master Button */}
          <button
            onClick={() => {
              const nextState = !config.autoScalpActive;
              onUpdateConfig({ autoScalpActive: nextState, continuousMode: true });
              if (nextState && !isPositionOpen) {
                // Immediate initial scalp trigger!
                setTimeout(onManualTrigger, 100);
              }
            }}
            className={`py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              config.autoScalpActive
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 hover:scale-[1.01]'
            }`}
          >
            {config.autoScalpActive ? (
              <>
                <Square className="w-4 h-4 fill-white" />
                <span>Pause Auto-Scalper</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Start Continuous Auto-Scalper</span>
              </>
            )}
          </button>

          {/* 2. Manual One-Click Scalp */}
          <button
            onClick={onManualTrigger}
            disabled={isPositionOpen}
            className={`py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
              isPositionOpen
                ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                : signals.readyToTrigger
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="Immediately trigger a 1-second scalp cycle using current order book state"
          >
            <Zap className={`w-4 h-4 ${signals.readyToTrigger ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>Force 1s Scalp Now</span>
          </button>
        </div>

        {/* Core Parameters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3.5">
          {/* Trade Capital Size ($) */}
          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Trade Size (USD)</span>
              <DollarSign className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 text-xs">$</span>
              <input
                type="number"
                step="0.5"
                min="1"
                value={config.tradeSizeUsd}
                onChange={(e) => onUpdateConfig({ tradeSizeUsd: parseFloat(e.target.value) || 3 })}
                className="w-full bg-transparent font-mono font-bold text-sm text-white focus:outline-none"
              />
            </div>
            {/* Quick preset buttons */}
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {[1, 3, 5, 10].map((val) => (
                <button
                  key={val}
                  onClick={() => {
                    onUpdateConfig({ tradeSizeUsd: val });
                    // If user selects $1 and current coin requires > $1.50 min (like BTC), suggest or auto-switch to AVAX
                    if (val === 1 && (config.symbol.includes('BTC') || config.symbol.includes('SOL'))) {
                      const quote = config.quoteCurrency || 'UST';
                      onUpdateConfig({ tradeSizeUsd: 1, symbol: quote === 'UST' ? 'tAVAX:UST' : 'tAVAX:USD' });
                    }
                  }}
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                    config.tradeSizeUsd === val
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold'
                      : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  ${val}
                </button>
              ))}
              {availableUsd > 0 && (
                <button
                  onClick={() => {
                    const fullUsd = Math.floor(availableUsd * 100) / 100;
                    const quote = config.quoteCurrency || 'USD';
                    const targetSymbol = fullUsd <= 0.85
                      ? (quote === 'UST' ? 'tSHIB:UST' : 'tSHIB:USD')
                      : fullUsd <= 1.5
                      ? (quote === 'UST' ? 'tAVAX:UST' : 'tAVAX:USD')
                      : config.symbol;
                    onUpdateConfig({
                      tradeSizeUsd: fullUsd,
                      symbol: targetSymbol,
                      quoteCurrency: quote,
                      targetProfitUsd: 0.00004,
                      targetProfitPercent: 0.004,
                    });
                  }}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 font-bold border border-blue-500/30"
                  title="Use 100% of available USD/USDT balance"
                >
                  100% Balance (${(Math.floor(availableUsd * 100) / 100).toFixed(2)})
                </button>
              )}
            </div>
            {config.tradeSizeUsd <= 1.5 && (
              <div className="mt-1 text-[9px] text-amber-400/90 font-mono flex items-center justify-between">
                <span>$1 fits: AVAX &amp; ADA</span>
                <button
                  onClick={() => {
                    const quote = config.quoteCurrency || 'UST';
                    onUpdateConfig({ symbol: quote === 'UST' ? 'tAVAX:UST' : 'tAVAX:USD' });
                  }}
                  className="text-cyan-400 hover:underline"
                >
                  Set AVAX
                </button>
              </div>
            )}
          </div>

          {/* Target Profit per Scalp (User formula: 0.0000004 or 0.00004 or 0.0004) */}
          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Target Profit ($ &amp; %)</span>
              <Percent className="w-3 h-3 text-amber-400" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 font-mono">+$</span>
                <input
                  type="number"
                  step="0.0000001"
                  min="0.0000001"
                  value={config.targetProfitUsd}
                  onChange={(e) => {
                    const usd = parseFloat(e.target.value) || 0.00004;
                    const pct = config.tradeSizeUsd > 0 ? (usd / config.tradeSizeUsd) * 100 : 0.00133;
                    onUpdateConfig({ targetProfitUsd: usd, targetProfitPercent: pct });
                  }}
                  className="w-28 bg-transparent font-mono font-bold text-xs text-emerald-400 focus:outline-none"
                />
              </div>
              <div className="text-[10px] font-mono text-cyan-400 font-bold">
                {((config.targetProfitUsd / (config.tradeSizeUsd || 1)) * 100).toFixed(5)}%
              </div>
            </div>
            {/* Quick preset buttons including $0.00004, $0.00001, $0.00010, $0.0004 */}
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {[
                { usd: 0.00004, label: '+$0.00004 (Target)' },
                { usd: 0.00001, label: '+$0.00001' },
                { usd: 0.00010, label: '+$0.00010' },
                { usd: 0.00040, label: '+$0.00040' },
                { usd: 0.00100, label: '+$0.0010' },
              ].map((item) => (
                <button
                  key={item.usd}
                  onClick={() => {
                    const pct = config.tradeSizeUsd > 0 ? (item.usd / config.tradeSizeUsd) * 100 : 0.00133;
                    onUpdateConfig({ targetProfitUsd: item.usd, targetProfitPercent: pct });
                  }}
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-all ${
                    config.targetProfitUsd === item.usd
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scalp Hold Duration (1-5 seconds window) */}
          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Hold Window (1-5s)</span>
              <Clock className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-sm text-cyan-300">
                {(config.maxHoldDurationMs / 1000).toFixed(0)} Seconds
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                ZERO-LOSS SCRATCH
              </span>
            </div>
            {/* Quick 1-5 second buttons */}
            <div className="flex items-center gap-1 mt-1.5">
              {[
                { ms: 1000, label: '1s' },
                { ms: 2000, label: '2s (Turbo)' },
                { ms: 3000, label: '3s' },
                { ms: 5000, label: '5s' },
              ].map((item) => (
                <button
                  key={item.ms}
                  onClick={() => onUpdateConfig({ maxHoldDurationMs: item.ms })}
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded flex-1 text-center transition-all ${
                    config.maxHoldDurationMs === item.ms
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="text-[9px] text-slate-500 font-mono mt-1">
              Every 2s: Profit locks &rarr; Instant exit &rarr; Next trade runs!
            </div>
          </div>

          {/* Execution Order Type & Fee Mode */}
          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Order Type &amp; Fees</span>
              <Percent className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={config.orderType}
                onChange={(e) => onUpdateConfig({ orderType: e.target.value as any })}
                className="bg-slate-900 font-mono font-bold text-xs text-white focus:outline-none cursor-pointer rounded px-1.5 py-1 border border-slate-800"
              >
                <option value="EXCHANGE MARKET">Market (Taker)</option>
                <option value="EXCHANGE LIMIT">Limit (Maker 0 Slip)</option>
              </select>

              <select
                value={config.zeroFeeMode ? 'zero' : 'standard'}
                onChange={(e) => {
                  if (e.target.value === 'zero') {
                    onUpdateConfig({ zeroFeeMode: true, makerFeeRate: 0, takerFeeRate: 0 });
                  } else {
                    onUpdateConfig({ zeroFeeMode: false, makerFeeRate: 0.001, takerFeeRate: 0.002, enforceFeeGuard: true });
                  }
                }}
                className="bg-slate-900 font-mono font-bold text-xs text-white focus:outline-none cursor-pointer rounded px-1.5 py-1 border border-slate-800"
              >
                <option value="zero">0% Zero Fee</option>
                <option value="standard">0.10/0.20% Fee</option>
              </select>
            </div>
            <div className={`text-[9px] font-mono mt-1.5 font-semibold truncate ${config.zeroFeeMode ? 'text-emerald-400' : 'text-slate-400'}`}>
              {config.zeroFeeMode ? 'Zero Fee Mode Active' : 'Real Fee Guard Active'}
            </div>
          </div>
        </div>

        {/* Expandable Advanced Thresholds Drawer */}
        {showAdvanced && (
          <div className="mt-3.5 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Step 3: Min OBI Ratio (Bid/Ask): <span className="text-white font-mono font-bold">{config.minObiRatio || 1.5}x</span>
              </label>
              <div className="flex items-center gap-1.5 mt-1">
                {[1.2, 1.5, 2.0, 3.0].map((r) => (
                  <button
                    key={r}
                    onClick={() => onUpdateConfig({ minObiRatio: r })}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      (config.minObiRatio || 1.5) === r
                        ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50 font-bold'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Max Hold Duration: <span className="text-white font-mono font-bold">{config.maxHoldDurationMs / 1000}s</span>
              </label>
              <div className="flex items-center gap-1.5 mt-1">
                {[2000, 4000, 6000, 10000].map((ms) => (
                  <button
                    key={ms}
                    onClick={() => onUpdateConfig({ maxHoldDurationMs: ms })}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      config.maxHoldDurationMs === ms
                        ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 font-bold'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {ms / 1000}s
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Step 4: Spread Filter Guard:
              </label>
              <label className="flex items-center gap-2 cursor-pointer mt-1 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={config.enforceSpreadFilter !== false}
                  onChange={(e) => onUpdateConfig({ enforceSpreadFilter: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-[11px]">Block entry if Spread &gt; Target Move</span>
              </label>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Min OFI Imbalance Threshold: <span className="text-white font-mono font-bold">+{config.minImbalanceThreshold}%</span>
              </label>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={config.minImbalanceThreshold}
                onChange={(e) => onUpdateConfig({ minImbalanceThreshold: parseInt(e.target.value, 10) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                <span>+10% (Loose)</span>
                <span>+60% (Strict)</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Aggressive Buy Volume Ratio: <span className="text-white font-mono font-bold">{config.minAggressiveBuyRatio}%</span>
              </label>
              <input
                type="range"
                min="50"
                max="85"
                step="5"
                value={config.minAggressiveBuyRatio}
                onChange={(e) => onUpdateConfig({ minAggressiveBuyRatio: parseInt(e.target.value, 10) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                <span>50% (Parity)</span>
                <span>85% (Frenzy)</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Tight Micro Stop-Loss Buffer: <span className="text-white font-mono font-bold">{config.stopLossBps} bps</span>
              </label>
              <input
                type="range"
                min="2"
                max="20"
                step="1"
                value={config.stopLossBps}
                onChange={(e) => onUpdateConfig({ stopLossBps: parseInt(e.target.value, 10) })}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                <span>2 bps (0.02%)</span>
                <span>20 bps (0.20%)</span>
              </div>
            </div>

            {/* Checkbox safeguards */}
            <div className="sm:col-span-3 flex flex-wrap items-center gap-4 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.buyOnDipOnly !== false}
                  onChange={(e) => onUpdateConfig({ buyOnDipOnly: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-emerald-300 font-semibold">Timing Engine: Neechay Ho Tab Lagawo (Wait for dip, never enter at peak)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.strictNoLoss !== false}
                  onChange={(e) => onUpdateConfig({ strictNoLoss: e.target.checked, strictZeroLossStop: true })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-emerald-300 font-semibold">Strict No-Loss Protection (Never sell at loss, hold until profit)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enforceFeeGuard}
                  onChange={(e) => onUpdateConfig({ enforceFeeGuard: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span>Enforce Strict Fee & Slippage Guard (Block entries if net expectancy &le; 0)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.requireMicropricePremium}
                  onChange={(e) => onUpdateConfig({ requireMicropricePremium: e.target.checked })}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span>Require Positive Microprice Skew ($P_{'{micro}'} &gt; P_{'{mid}'}$)</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
