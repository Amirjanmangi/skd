import React, { useEffect, useState } from 'react';
import { ActivePosition, BotConfig } from '../types/trading';
import { Clock, ShieldAlert, ArrowUpRight, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';

interface ActivePositionCardProps {
  position: ActivePosition | null;
  onClosePosition: () => void;
  onTakeProfit?: () => void;
  config: BotConfig;
}

export const ActivePositionCard: React.FC<ActivePositionCardProps> = ({
  position,
  onClosePosition,
  onTakeProfit,
  config,
}) => {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!position || position.status !== 'OPEN') {
      setElapsedMs(0);
      return;
    }

    const interval = setInterval(() => {
      const diff = Date.now() - position.entryTime;
      setElapsedMs(diff);
    }, 25);

    return () => clearInterval(interval);
  }, [position]);

  if (!position || position.status !== 'OPEN') {
    return (
      <div className="bg-[#0f1420] border border-slate-800 rounded-xl p-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-300">No Active Scalp Open</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              2-Second Fast Turbo Loop: Next trade executes continuously on target hit!
            </div>
          </div>
        </div>

        <div className="text-right font-mono text-xs text-slate-400">
          <span className="text-slate-500">Target per scalp:</span>{' '}
          <span className="text-emerald-400 font-bold">
            +${(config.targetProfitUsd || 0.00004).toFixed(6)}
          </span>
        </div>
      </div>
    );
  }

  const fastHoldLimit = config.maxHoldDurationMs || 2000;
  const progressPerc = Math.min(100, (elapsedMs / fastHoldLimit) * 100);
  const isNetProfit = position.netPnl >= 0;
  const isTargetHit = position.netPnl >= (config.targetProfitUsd || 0.00004);

  return (
    <div className="bg-[#0f1420] border-2 border-emerald-500/40 rounded-xl p-4 shadow-xl shadow-emerald-500/5 relative overflow-hidden">
      {/* Top Countdown Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
        <div
          className="h-full bg-emerald-400 transition-all duration-75"
          style={{ width: `${progressPerc}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Left: Position Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm animate-pulse">
            <ArrowUpRight className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">
                SPOT BUY {position.symbol.replace('t', '').replace(':', '/')}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                ${position.usdValue.toFixed(2)} Capital
              </span>
              {isTargetHit && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-bold flex items-center gap-1 animate-bounce">
                  <CheckCircle2 className="w-3 h-3" />
                  PROFIT TARGET HIT
                </span>
              )}
            </div>

            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3 mt-1">
              <span>Entry: ${position.entryPrice.toLocaleString()}</span>
              <span>·</span>
              <span className="text-white font-medium">Mark: ${position.currentPrice.toLocaleString()}</span>
              <span>·</span>
              <span className="flex items-center gap-1 text-cyan-400">
                <Clock className="w-3 h-3" />
                {elapsedMs >= fastHoldLimit ? (
                  <span className="text-emerald-400 font-semibold animate-pulse">⚡ Target Lock & Auto-Reentry</span>
                ) : (
                  `${(elapsedMs / 1000).toFixed(1)}s / ${(fastHoldLimit / 1000).toFixed(1)}s Cycle`
                )}
              </span>
              <span>·</span>
              <span className="text-emerald-400 font-bold">
                Target: +${(config.targetProfitUsd || 0.00004).toFixed(6)}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live PnL & Fee Breakdown */}
        <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800">
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono text-slate-400">
              {config.zeroFeeMode ? 'Net Profit (0% Fee)' : 'Net Profit (After Fees)'}
            </div>
            <div
              className={`text-xl font-bold font-mono leading-none ${
                isNetProfit ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isNetProfit ? '+' : ''}${Math.abs(position.netPnl) < 0.0001 ? position.netPnl.toFixed(7) : position.netPnl.toFixed(5)}
            </div>
          </div>

          <div className="border-l border-slate-800 pl-3 text-left font-mono text-[10px] text-slate-400">
            <div>Gross: <span className={position.grossPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {position.grossPnl >= 0 ? '+' : ''}${position.grossPnl.toFixed(5)}
            </span></div>
            <div>Fee: <span className="text-slate-300 font-bold">
              {config.zeroFeeMode
                ? '0% ($0.00)'
                : `$${(position.totalFees || 0).toFixed(5)} (~${((config.takerFeeRate || 0.002) * 100).toFixed(2)}%)`}
            </span></div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {onTakeProfit && (
            <button
              onClick={onTakeProfit}
              className="py-2 px-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
              title="Instantly take profit and trigger next scalp"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Take Profit &amp; Next Trade (+${(config.targetProfitUsd || 0.00004).toFixed(6)})</span>
            </button>
          )}

          <button
            onClick={onClosePosition}
            className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1"
            title="Instant exit"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Scratch</span>
          </button>
        </div>
      </div>
    </div>
  );
};
