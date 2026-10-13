import React from 'react';
import { TradesData } from '../types/trading';
import { Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface TradeTapeStreamProps {
  tradesData: TradesData | null;
  isLoading: boolean;
}

export const TradeTapeStream: React.FC<TradeTapeStreamProps> = ({ tradesData, isLoading }) => {
  if (isLoading && !tradesData) {
    return (
      <div className="bg-[#0f1420] border border-slate-800 rounded-xl p-4 shadow-lg min-h-[380px] flex items-center justify-center">
        <div className="text-xs text-slate-500 font-mono">Connecting to Bitfinex trade tape...</div>
      </div>
    );
  }

  if (!tradesData) return null;

  return (
    <div className="bg-[#0f1420] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-xs text-white uppercase tracking-wider">
              Real-Time Trade Tape
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Taker Ratio: <strong className={tradesData.aggressiveBuyRatio >= 50 ? 'text-emerald-400' : 'text-rose-400'}>
              {tradesData.aggressiveBuyRatio.toFixed(1)}% Buy
            </strong>
          </div>
        </div>

        {/* Aggregate Tape Delta Bar */}
        <div className="my-2 p-2 rounded-lg bg-slate-950 border border-slate-800">
          <div className="flex justify-between text-[11px] font-mono mb-1">
            <span className="text-emerald-400 font-medium">Buys: {tradesData.buyVolume.toFixed(3)}</span>
            <span className="text-slate-400 font-medium">
              Delta: <strong className={tradesData.tradeDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {tradesData.tradeDelta >= 0 ? '+' : ''}{tradesData.tradeDelta.toFixed(3)}
              </strong>
            </span>
            <span className="text-rose-400 font-medium">Sells: {tradesData.sellVolume.toFixed(3)}</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-400 transition-all duration-200"
              style={{ width: `${tradesData.aggressiveBuyRatio}%` }}
            />
            <div
              className="h-full bg-rose-500 transition-all duration-200"
              style={{ width: `${100 - tradesData.aggressiveBuyRatio}%` }}
            />
          </div>
        </div>

        {/* Table Column Headers */}
        <div className="grid grid-cols-4 text-[10px] uppercase font-mono text-slate-500 py-1 px-2 border-b border-slate-900">
          <div>Time</div>
          <div>Side</div>
          <div className="text-right">Price</div>
          <div className="text-right">Size (USD)</div>
        </div>

        {/* Trade items */}
        <div className="space-y-0.5 max-h-[260px] overflow-y-auto scrollbar-thin my-1 pr-1">
          {tradesData.trades.slice(0, 16).map((trade) => {
            const isBuy = trade.side === 'buy';

            return (
              <div
                key={trade.id}
                className="grid grid-cols-4 text-[11px] font-mono py-1 px-2 rounded hover:bg-slate-900/40 transition-colors items-center"
              >
                <div className="text-slate-500 text-[10px]">{trade.time.slice(0, 8)}</div>
                <div className="flex items-center gap-1">
                  {isBuy ? (
                    <span className="text-emerald-400 font-bold flex items-center">
                      <ArrowUpRight className="w-3 h-3" /> BUY
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold flex items-center">
                      <ArrowDownRight className="w-3 h-3" /> SELL
                    </span>
                  )}
                </div>
                <div className={`text-right font-medium ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </div>
                <div className="text-right text-slate-300">
                  ${trade.usdValue.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-500 flex justify-between">
        <span>Executions Tape: {tradesData.trades.length} ticks</span>
        <span>Buys: {tradesData.buyCount} / Sells: {tradesData.sellCount}</span>
      </div>
    </div>
  );
};
