import React from 'react';
import { Flame, TrendingUp, Zap, Target, ArrowRight, ShieldCheck, Crosshair } from 'lucide-react';
import { Ticker } from '../types/trading';

interface SurgeHunterRadarProps {
  tickers: Ticker[];
  activeSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  multiCoinHunter: boolean;
  onToggleHunter: () => void;
  quoteCurrency: 'USD' | 'UST';
  onChangeQuoteCurrency: (curr: 'USD' | 'UST') => void;
}

export const SurgeHunterRadar: React.FC<SurgeHunterRadarProps> = ({
  tickers,
  activeSymbol,
  onSelectSymbol,
  multiCoinHunter,
  onToggleHunter,
  quoteCurrency,
  onChangeQuoteCurrency,
}) => {
  // Sort tickers by best 2-minute post-fee profit score or volatility
  const sortedTickers = [...tickers].sort((a, b) => {
    const scoreA = a.best2MinScore ?? (a.surgeScore || a.volatility * 10);
    const scoreB = b.best2MinScore ?? (b.surgeScore || b.volatility * 10);
    return scoreB - scoreA;
  });

  const topSurging = sortedTickers[0];

  return (
    <div className="bg-[#0f1420] border border-slate-800 rounded-xl p-4 shadow-lg">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-white">2-Minute Volatile Coin Auto-Hunter &amp; Scanner</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold animate-pulse">
                POST-FEE NET PROFIT SCANNER
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Scans Bitfinex coins to find which coin generates guaranteed profit after Taker (0.20%) &amp; Maker (0.10%) fees within 2 minutes
            </p>
          </div>
        </div>

        {/* Controls: Multi-Coin Hunter switch & Quote Currency selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quote Currency Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-slate-500 px-1 text-[10px]">PAIR:</span>
            <button
              onClick={() => onChangeQuoteCurrency('USD')}
              className={`px-2 py-0.5 rounded font-bold transition-colors ${
                quoteCurrency === 'USD'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              USD
            </button>
            <button
              onClick={() => onChangeQuoteCurrency('UST')}
              className={`px-2 py-0.5 rounded font-bold transition-colors ${
                quoteCurrency === 'UST'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              USDT (UST)
            </button>
          </div>

          {/* Hunter Toggle */}
          <button
            onClick={onToggleHunter}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 transition-all border ${
              multiCoinHunter
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Automatically routes the trade to the highest momentum coin that beats fees in 2 minutes"
          >
            <Crosshair className={`w-3.5 h-3.5 ${multiCoinHunter ? 'text-amber-400' : 'text-slate-500'}`} />
            <span>Auto-Hunter (Best Volatile Coin): {multiCoinHunter ? 'ACTIVE' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Top 2-Min Volatile Coin Spotlight Banner */}
      {topSurging && (
        <div className={`mt-3 p-3 rounded-lg border flex flex-wrap items-center justify-between gap-3 shadow-md ${
          topSurging.hasAggressiveSellers
            ? 'bg-gradient-to-r from-rose-950/40 via-slate-900 to-amber-950/20 border-rose-500/50'
            : 'bg-gradient-to-r from-emerald-950/30 via-slate-900 to-amber-950/20 border-emerald-500/40'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-mono font-bold text-sm ${
              topSurging.hasAggressiveSellers
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
            }`}>
              #1
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-white font-mono">{topSurging.cleanSymbol}</span>
                {topSurging.hasAggressiveSellers ? (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold font-mono border border-rose-500/40">
                    ⚠️ SELLER DUMP DETECTED — WAITING FOR BUYERS
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono border border-emerald-500/40">
                    🟢 CONFIRMED 2-MIN PROFIT COIN
                  </span>
                )}
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  +{(topSurging.volatility).toFixed(1)}% Volatility
                </span>
                {topSurging.best2MinScore !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-bold ${
                    topSurging.hasAggressiveSellers
                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  }`}>
                    Score: {topSurging.best2MinScore}/100
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                Mark: ${topSurging.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} &bull; Spread: {topSurging.spreadBps} bps &bull; Min Order: ${topSurging.minRequiredUsd ?? 0.85} &bull; 2-Min Net Target: <strong className="text-emerald-400">+$0.000040</strong> (after Taker &amp; Maker fees)
                {topSurging.disqualifiedReason && (
                  <span className="text-rose-400 ml-1.5">&bull; {topSurging.disqualifiedReason}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectSymbol(topSurging.symbol)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all border ${
                activeSymbol === topSurging.symbol
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-emerald-300 border-emerald-500/40'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>{activeSymbol === topSurging.symbol ? 'Targeting #1 Volatile Coin' : 'Switch Target to #1 Coin'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Grid of All Volatile Coins */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-3">
        {sortedTickers.slice(0, 8).map((ticker, idx) => {
          const isSelected = ticker.symbol === activeSymbol;
          const isPositive = ticker.dailyChangePerc >= 0;
          const isBlocked = ticker.hasAggressiveSellers;

          return (
            <button
              key={ticker.symbol}
              onClick={() => onSelectSymbol(ticker.symbol)}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'bg-slate-800 border-emerald-500/60 ring-1 ring-emerald-500/40 shadow-sm shadow-emerald-500/10'
                  : isBlocked
                  ? 'bg-rose-950/20 hover:bg-rose-950/30 border-rose-900/40 opacity-80'
                  : 'bg-slate-950/70 hover:bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-slate-500 font-bold">#{idx + 1}</span>
                <span className="font-mono font-bold text-xs text-white truncate">{ticker.cleanSymbol}</span>
              </div>

              <div className="text-xs font-mono font-semibold text-slate-200">
                ${ticker.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono mt-1">
                <span className={isPositive ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {isPositive ? '+' : ''}{ticker.dailyChangePerc.toFixed(1)}%
                </span>
                <span className="text-slate-400">
                  Vol: {ticker.volatility.toFixed(1)}%
                </span>
              </div>

              <div className="mt-1 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono">
                <span className="text-slate-500">Min: ${ticker.minRequiredUsd ?? 1}</span>
                <span className={
                  isBlocked
                    ? 'text-rose-400 font-bold'
                    : ticker.twoMinViable
                    ? 'text-emerald-400 font-bold'
                    : 'text-amber-400'
                }>
                  {isBlocked ? '⚠️ Dump' : ticker.twoMinViable ? '✓ 2m Win' : `${ticker.spreadBps}bps`}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
