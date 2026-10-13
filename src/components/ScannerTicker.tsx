import React from 'react';
import { Flame, TrendingUp, TrendingDown, ArrowRightLeft, Sparkles } from 'lucide-react';
import { Ticker } from '../types/trading';

interface ScannerTickerProps {
  tickers: Ticker[];
  activeSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  isLoading: boolean;
  autoScanPick: boolean;
  onToggleAutoScan: () => void;
}

export const ScannerTicker: React.FC<ScannerTickerProps> = ({
  tickers,
  activeSymbol,
  onSelectSymbol,
  isLoading,
  autoScanPick,
  onToggleAutoScan,
}) => {
  return (
    <div className="bg-[#0f1420] border-b border-slate-800/80 px-4 py-2">
      <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Scanner Label & Mode */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Volatile Coins Radar</span>
          </div>
          <button
            onClick={onToggleAutoScan}
            className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
              autoScanPick
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Automatically switch bot target to the pair with highest volatility and imbalance momentum"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Auto-Track Most Volatile: {autoScanPick ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Horizontal Scrollable Pair Cards */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
          {isLoading && tickers.length === 0 ? (
            <div className="text-xs text-slate-500 py-1">Scanning Bitfinex spot pairs...</div>
          ) : (
            tickers.map((t) => {
              const isSelected = t.symbol === activeSymbol;
              const isPositive = t.dailyChangePerc >= 0;
              // High volatility threshold
              const isHot = t.volatility > 2.5;

              return (
                <button
                  key={t.symbol}
                  onClick={() => onSelectSymbol(t.symbol)}
                  className={`shrink-0 px-2.5 py-1.5 rounded-lg border text-left transition-all flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500/50 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                      : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/90 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs font-mono text-white">
                        {t.cleanSymbol}
                      </span>
                      {isHot && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono font-medium">
                          HOT
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <span>${t.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-[11px] font-mono font-medium flex items-center justify-end gap-0.5 ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{isPositive ? '+' : ''}{t.dailyChangePerc.toFixed(2)}%</span>
                    </div>
                    <div className="text-[9px] font-mono text-slate-500">
                      Vol: <span className="text-slate-400">{t.volatility.toFixed(1)}%</span> · Sp: <span className="text-slate-400">{t.spreadBps.toFixed(1)}b</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
