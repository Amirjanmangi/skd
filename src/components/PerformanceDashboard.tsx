import React from 'react';
import { ClosedTradeRecord } from '../types/trading';
import { DollarSign, Percent, Award, Clock, RotateCcw, ShieldCheck } from 'lucide-react';

interface PerformanceDashboardProps {
  closedTrades: ClosedTradeRecord[];
  onResetStats: () => void;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  closedTrades,
  onResetStats,
}) => {
  const totalTrades = closedTrades.length;
  const wins = closedTrades.filter((t) => t.netPnl > 0.0000001).length;
  const losses = closedTrades.filter((t) => t.netPnl < -0.0000001).length;
  const scratches = closedTrades.filter((t) => Math.abs(t.netPnl) <= 0.0000001).length;

  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : (closedTrades.length === 0 ? 100 : 0);
  const totalGrossPnl = closedTrades.reduce((acc, t) => acc + t.grossPnl, 0);
  const totalFeesPaid = closedTrades.reduce((acc, t) => acc + t.totalFees, 0);
  const totalNetPnl = closedTrades.reduce((acc, t) => acc + t.netPnl, 0);
  const avgDurationMs = totalTrades > 0
    ? Math.round(closedTrades.reduce((acc, t) => acc + t.durationMs, 0) / totalTrades)
    : 0;

  const formatPnl = (val: number) => {
    if (Math.abs(val) < 0.00001) return val.toFixed(7);
    if (Math.abs(val) < 0.001) return val.toFixed(6);
    return val.toFixed(5);
  };

  return (
    <div className="bg-[#0f1420] border border-slate-800 rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-xs text-white uppercase tracking-wider">
            Live Scalping Performance & Fee Audit
          </span>
        </div>

        <button
          onClick={onResetStats}
          disabled={totalTrades === 0}
          className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 disabled:opacity-40 transition-colors"
          title="Reset session statistics"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Session</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
        {/* Metric 1: Net Realized Profit */}
        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] uppercase font-mono text-slate-400 mb-1">Net Realized PnL</div>
          <div
            className={`text-xl font-bold font-mono ${
              totalNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totalNetPnl >= 0 ? '+' : ''}${formatPnl(totalNetPnl)}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Real profit after all fees
          </div>
        </div>

        {/* Metric 2: Total Exchange Fees Paid */}
        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] uppercase font-mono text-slate-400 mb-1">Bitfinex Fees Paid</div>
          <div className="text-xl font-bold font-mono text-amber-400">
            -${formatPnl(totalFeesPaid)}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Maker/Taker spot fee
          </div>
        </div>

        {/* Metric 3: Win Rate */}
        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] uppercase font-mono text-slate-400 mb-1">Win Rate %</div>
          <div
            className={`text-xl font-bold font-mono ${
              winRate >= 80 ? 'text-emerald-400' : winRate >= 50 ? 'text-amber-400' : 'text-slate-300'
            }`}
          >
            {winRate.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {wins}W · {losses}L · {scratches}S
          </div>
        </div>

        {/* Metric 4: Total Completed Scalps */}
        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
          <div className="text-[10px] uppercase font-mono text-slate-400 mb-1">Total Scalps</div>
          <div className="text-xl font-bold font-mono text-white">
            {totalTrades}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Gross: ${formatPnl(totalGrossPnl)}
          </div>
        </div>

        {/* Metric 5: Average Duration */}
        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 col-span-2 sm:col-span-1">
          <div className="text-[10px] uppercase font-mono text-slate-400 mb-1">Avg Execution Speed</div>
          <div className="text-xl font-bold font-mono text-cyan-400">
            {avgDurationMs}ms
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            Ultra-fast sub-second cycle
          </div>
        </div>
      </div>
    </div>
  );
};
