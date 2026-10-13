import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  Layers,
  Zap,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Activity,
  Calculator,
  Flame,
} from 'lucide-react';
import { HftSignals, OrderBookData, TradesData, BotConfig, CandlesData } from '../types/trading';
import { calculateBitfinexFees } from '../utils/hftMath';

interface HftStrategyRadarProps {
  signals: HftSignals;
  book: OrderBookData | null;
  trades: TradesData | null;
  candles?: CandlesData | null;
  config: BotConfig;
  onForceTrade?: () => void;
}

export const HftStrategyRadar: React.FC<HftStrategyRadarProps> = ({
  signals,
  book,
  trades,
  candles,
  config,
  onForceTrade,
}) => {
  const fees = calculateBitfinexFees(
    config.tradeSizeUsd,
    config.orderType,
    config.makerFeeRate,
    config.takerFeeRate,
    config.zeroFeeMode
  );

  const targetPct = config.targetProfitPercent || 0.004;

  return (
    <div className="bg-[#0f1420] border border-slate-800 rounded-xl p-4 shadow-lg space-y-3.5">
      {/* Header bar with Confluence Meter & 2-Min Post-Fee Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400" />
              6-Pillar Market Microstructure &amp; Dip Radar
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
              TARGET COIN: {config.symbol}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
              {config.symbol.toUpperCase().includes('ETH')
                ? 'ETH TARGET: ENTRY + $4.00 (INSTANT EXIT & NEXT TRADE)'
                : `2-MIN TARGET: +$${(config.targetProfitUsd || 0.00004).toFixed(6)} NET (POST TAKER & MAKER FEES)`}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
              🛡️ STOP LOSS REMOVED (HOLD TILL PROFIT TARGET)
            </span>
            {signals.readyToTrigger ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold animate-pulse flex items-center gap-1">
                <Flame className="w-3 h-3 text-emerald-400" />
                CONFLUENCE VERIFIED · READY TO SCALP
              </span>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium flex items-center gap-1">
                <Activity className="w-3 h-3 text-amber-400 animate-pulse" />
                ANALYZING FLOW · WAITING FOR BOTTOM DIP &amp; BUYER SPIKE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            OBI Imbalance + Buyers CVD + Spread/Fees Guard + Volume Spike + VWAP/EMA + Microprice Tick Skew
          </p>
        </div>

        {/* Confluence Score Dial */}
        <div className="flex items-center gap-3 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Confluence</div>
            <div
              className={`text-lg font-bold font-mono leading-none ${
                signals.confluenceScore >= 70
                  ? 'text-emerald-400'
                  : signals.confluenceScore >= 50
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {signals.confluenceScore}%
            </div>
          </div>
          <div className="w-16 h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                signals.confluenceScore >= 70
                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                  : signals.confluenceScore >= 50
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${signals.confluenceScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* PROMINENT LIVE TARGET & FLUCTUATION POSITION INSPECTION HUD ("Check bhi karlo kahan laga rahay hain") */}
      <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-mono text-[11px]">Kahan Laga Rahay Hain:</span>
              <span className="font-mono font-bold text-white text-sm bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                {config.symbol}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-mono text-[11px]">Live Price:</span>
              <span className="font-mono font-bold text-emerald-400">
                ${(book?.midPrice || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-mono text-[11px]">Net Scalp Target:</span>
              <span className="font-mono font-bold text-cyan-400">
                {config.symbol.toUpperCase().includes('ETH')
                  ? 'ETH Entry + $4.00 (Exit & Next Trade)'
                  : `+$${(config.targetProfitUsd || 0.00004).toFixed(6)} USD`}
              </span>
            </div>
          </div>

          {/* Aggressive Buyers vs Sellers Meter */}
          <div className="flex items-center gap-3 bg-slate-900/90 px-3 py-1 rounded-lg border border-slate-800 text-[11px] font-mono">
            <span className="text-slate-400">Flow Pressure:</span>
            <div className="flex items-center gap-1.5">
              <span className={signals.aggressiveBuyersConfirmed ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                🟢 Buyers: {signals.aggressiveBuyScore.toFixed(0)}%
              </span>
              <span className="text-slate-600">|</span>
              <span className={signals.isSellersDumping ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                🔴 Sellers: {signals.aggressiveSellScore.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Fluctuation Channel & Timing Meter ("Neechay anay ka wait kar, neechay wali jagah say lagao") */}
        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">Fluctuation Channel (Swing Low to High):</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                signals.isAtFluctuationBottom
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : signals.isAtPeak
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {signals.isAtFluctuationBottom
                  ? '🟢 NEECHAY HAI (BOTTOM DIP ZONE - BUY ALLOWED)'
                  : signals.isAtPeak
                  ? '⚠️ OOPER HAI (RESISTANCE PEAK - ENTRY BLOCKED)'
                  : '⏳ MID-RANGE (WAITING FOR PULLBACK TO BOTTOM)'}
              </span>
            </div>
            <div className="text-slate-400">
              Position: <span className="text-white font-bold">{signals.fluctuationPositionPerc}%</span> of swing
            </div>
          </div>

          {/* Visual Channel Progress Bar */}
          <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex relative border border-slate-800">
            {/* Zone 1: 0 - 35% Bottom Zone */}
            <div className="w-[35%] bg-emerald-500/30 border-r border-emerald-500/50 flex items-center justify-center text-[8px] text-emerald-300 font-mono">
              ENTRY ZONE (0-35%)
            </div>
            {/* Zone 2: 35 - 65% Mid Zone */}
            <div className="w-[30%] bg-amber-500/20 border-r border-amber-500/40 flex items-center justify-center text-[8px] text-amber-300 font-mono">
              PULLBACK
            </div>
            {/* Zone 3: 65 - 100% Peak Zone */}
            <div className="w-[35%] bg-rose-500/20 flex items-center justify-center text-[8px] text-rose-300 font-mono">
              PEAK (NO BUY)
            </div>
            {/* Current Price Marker Pin */}
            <div
              className="absolute top-0 bottom-0 w-2 bg-white shadow-lg shadow-white/80 rounded-full transition-all duration-300 -translate-x-1"
              style={{ left: `${Math.max(2, Math.min(98, signals.fluctuationPositionPerc))}%` }}
              title={`Current Price at ${signals.fluctuationPositionPerc}% of range`}
            />
          </div>

          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>Low Support: ${signals.fluctuationLow > 0 ? signals.fluctuationLow.toFixed(4) : '—'}</span>
            <span className="text-slate-400">{signals.fluctuationBottomText}</span>
            <span>High Resistance: ${signals.fluctuationHigh > 0 ? signals.fluctuationHigh.toFixed(4) : '—'}</span>
          </div>
        </div>
      </div>

      {/* Seller Aggression & Dump Warning Banner */}
      <div className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-all ${
        signals.isSellersDumping
          ? 'bg-rose-950/40 border-rose-500/60 shadow-md shadow-rose-950/40'
          : signals.sellerExhaustionConfirmed
          ? 'bg-emerald-950/30 border-emerald-500/40 shadow-md shadow-emerald-950/20'
          : 'bg-slate-950/90 border-slate-800'
      }`}>
        <div className="flex items-start gap-2.5">
          <ShieldAlert className={`w-5 h-5 shrink-0 mt-0.5 ${
            signals.isSellersDumping
              ? 'text-rose-400 animate-pulse'
              : signals.sellerExhaustionConfirmed
              ? 'text-emerald-400'
              : 'text-amber-400'
          }`} />
          <div>
            <div className="font-semibold text-white flex items-center gap-2 flex-wrap">
              <span>Deep Seller Flow &amp; Chart Fall Analysis:</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                signals.isSellersDumping
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                  : signals.sellerExhaustionConfirmed
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {signals.isSellersDumping
                  ? '⚠️ ACTIVE SELLER DUMP (ENTRY STRICTLY BLOCKED)'
                  : signals.sellerExhaustionConfirmed
                  ? '🟢 SELLERS EXHAUSTED &amp; BOTTOM CONFIRMED ✓'
                  : 'ANALYZING CHART MOMENTUM'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 font-mono">
              {signals.sellerAggressionText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] shrink-0 border-t md:border-t-0 md:border-l border-slate-800/80 pt-2 md:pt-0 md:pl-3 flex-wrap">
          <div>
            <span className="text-slate-500">Support:</span>{' '}
            <span className="text-cyan-400 font-bold">
              ${signals.estimatedSupportLevel > 0 ? signals.estimatedSupportLevel.toFixed(4) : '—'}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Drop to Sup:</span>{' '}
            <span className={signals.distanceToSupportPerc > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
              -{signals.distanceToSupportPerc.toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-slate-500">Bounce:</span>{' '}
            <span className={signals.bounceConfirmationScore >= 60 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              {signals.bounceConfirmationScore}%
            </span>
          </div>
          <div>
            <span className="text-slate-500">2-Min Viability:</span>{' '}
            <span className={signals.postFeeViableIn2Min ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
              {signals.postFeeViableIn2Min ? '✓ NET PROFIT' : '✕ FEE DRAG'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of the 6 Strategy Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Pillar 1: 1-Second / 1-Minute Volume Spike */}
        <div
          className={`p-3 rounded-lg border transition-all ${
            signals.volumeRatioPass
              ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-500/5'
              : 'bg-slate-900/50 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1 font-medium text-slate-300">
              <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
              <span>1. Volume Spike</span>
            </div>
            {signals.volumeRatioPass ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-slate-500" />
            )}
          </div>

          <div className="text-lg font-mono font-bold text-white">
            {signals.volumeRatio.toFixed(2)}x
          </div>

          <div className="text-[10px] text-slate-400 mt-1 flex justify-between font-mono">
            <span>Req: &ge;{config.minVolumeRatio || 1.5}x</span>
            <span className={signals.volumeSpikeDetected ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {signals.volumeSpikeDetected ? 'SPIKE ✓' : 'NORMAL'}
            </span>
          </div>

          <div className="h-1.5 w-full bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-200 ${
                signals.volumeRatioPass ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
              style={{ width: `${Math.min(100, (signals.volumeRatio / ((config.minVolumeRatio || 1.5) * 1.5)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Pillar 2: Order Book Imbalance (OBI) */}
        <div
          className={`p-3 rounded-lg border transition-all ${
            signals.obiPass
              ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-500/5'
              : 'bg-slate-900/50 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1 font-medium text-slate-300">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>2. OBI Pressure</span>
            </div>
            {signals.obiPass ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-slate-500" />
            )}
          </div>

          <div className="text-lg font-mono font-bold text-white">
            {signals.obiRatio.toFixed(2)}x
          </div>

          <div className="text-[10px] text-slate-400 mt-1 flex justify-between font-mono">
            <span>Bids/Asks</span>
            <span className={signals.imbalanceScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              OFI: {signals.imbalanceScore >= 0 ? '+' : ''}{signals.imbalanceScore.toFixed(0)}%
            </span>
          </div>

          <div className="h-1.5 w-full bg-slate-800 rounded-full mt-2 overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-200"
              style={{ width: `${Math.min(100, (signals.obiRatio / 2.5) * 100)}%` }}
            />
          </div>
        </div>

        {/* Pillar 3: Trade Flow / CVD */}
        <div
          className={`p-3 rounded-lg border transition-all ${
            signals.aggressiveBuyPass
              ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-500/5'
              : 'bg-slate-900/50 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1 font-medium text-slate-300">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>3. Trade CVD</span>
            </div>
            {signals.aggressiveBuyPass ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-slate-500" />
            )}
          </div>

          <div className={`text-base font-mono font-bold truncate ${
            signals.cvdDirection === 'AGGRESSIVE_BUYING' ? 'text-emerald-400' : signals.cvdDirection === 'AGGRESSIVE_SELLING' ? 'text-rose-400' : 'text-amber-400'
          }`}>
            {signals.cvdDirection === 'AGGRESSIVE_BUYING' ? 'BUYERS FLOW' : signals.cvdDirection === 'AGGRESSIVE_SELLING' ? 'SELLER DUMP' : 'ABSORPTION'}
          </div>

          <div className="text-[10px] text-slate-400 mt-1 flex justify-between font-mono">
            <span>Buy Ratio:</span>
            <span className={signals.aggressiveBuyScore >= 50 ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
              {signals.aggressiveBuyScore.toFixed(0)}%
            </span>
          </div>

          <div className="text-[9px] text-slate-500 mt-1 font-mono">
            CVD: {signals.cvd >= 0 ? '+' : ''}{signals.cvd.toFixed(2)} delta
          </div>
        </div>

        {/* Pillar 4: Spread & Liquidity */}
        <div
          className={`p-3 rounded-lg border transition-all ${
            signals.spreadFilterPass
              ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-500/5'
              : 'bg-rose-950/20 border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1 font-medium text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>4. Spread &amp; Liquidity</span>
            </div>
            {signals.spreadFilterPass ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>

          <div className="text-lg font-mono font-bold text-white">
            {signals.spreadBps.toFixed(2)} bps
          </div>

          <div className="text-[10px] text-slate-400 mt-1 flex justify-between font-mono">
            <span>Wall Clearance</span>
            <span className={signals.sellWallClearancePass ? 'text-emerald-400' : 'text-amber-400'}>
              {signals.sellWallClearancePass ? 'CLEAR ✓' : 'WALL NEARBY'}
            </span>
          </div>

          <div className="text-[9px] text-slate-500 mt-1 font-mono truncate">
            {signals.spreadFilterPass ? 'Spread tight & safe' : 'Spread wide for market entry'}
          </div>
        </div>

        {/* Pillar 5: VWAP / EMA Trend Filter */}
        <div
          className={`p-3 rounded-lg border transition-all ${
            signals.trendFilterPass
              ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-500/5'
              : 'bg-slate-900/50 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1 font-medium text-slate-300">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              <span>5. VWAP / EMA</span>
            </div>
            {signals.trendFilterPass ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-slate-500" />
            )}
          </div>

          <div className={`text-base font-mono font-bold truncate ${
            signals.vwapTrend === 'ABOVE_VWAP_BULLISH' ? 'text-emerald-400' : signals.vwapTrend === 'AT_VWAP_SUPPORT' ? 'text-cyan-400' : 'text-amber-400'
          }`}>
            {signals.vwapTrend === 'ABOVE_VWAP_BULLISH' ? 'ABOVE VWAP' : signals.vwapTrend === 'AT_VWAP_SUPPORT' ? 'VWAP SUPPORT' : 'BELOW VWAP'}
          </div>

          <div className="text-[10px] text-slate-400 mt-1 flex justify-between font-mono">
            <span>VWAP: ${signals.vwap.toLocaleString()}</span>
            <span className={signals.emaTrend === 'BULLISH' ? 'text-emerald-400' : 'text-slate-400'}>
              EMA: {signals.emaTrend}
            </span>
          </div>

          <div className="text-[9px] text-slate-500 mt-1 font-mono truncate">
            Diff vs VWAP: {signals.vwapDeltaPerc >= 0 ? '+' : ''}{signals.vwapDeltaPerc}%
          </div>
        </div>

        {/* Pillar 6: Micro-Price Movement (Next Tick Pressure) & 2-Min Profit Math */}
        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1 font-medium text-slate-300">
              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              <span>6. Micro-Price Tick</span>
            </div>
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
              2-MIN NET
            </span>
          </div>

          <div className="text-lg font-mono font-bold text-emerald-400">
            +${(config.targetProfitUsd || 0.00004).toFixed(6)}
          </div>

          <div className="text-[10px] text-slate-400 mt-1 flex justify-between font-mono">
            <span>Next Tick Pressure:</span>
            <span className={signals.nextTickPressure === 'UPWARD_PRESSURE' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              {signals.nextTickPressure === 'UPWARD_PRESSURE' ? '▲ UP' : '— WAITING'}
            </span>
          </div>

          <div className="text-[9px] text-slate-500 mt-1 font-mono truncate">
            Round-Trip Fees: -${fees.totalFeesUsd.toFixed(5)}
          </div>
        </div>
      </div>

      {/* Real-Time Status, Gate Diagnosis & Immediate Trigger Strip */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 font-mono text-[11px]">Trade Gate Status:</span>
          <span
            className={`font-mono text-[11px] px-2 py-0.5 rounded font-bold flex items-center gap-1 ${
              signals.isSellersDumping
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : signals.isAtPeak
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : !signals.postFeeViableIn2Min
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : signals.readyToTrigger
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            {signals.isSellersDumping ? (
              '⚠️ PAUSED: SELLER DUMP ONGOING (WAITING FOR SUPPORT)'
            ) : signals.isAtPeak ? (
              '⏳ WAITING FOR DIP: PRICE AT RESISTANCE PEAK'
            ) : !signals.postFeeViableIn2Min ? (
              '⏳ WAITING FOR 2-MIN VOLATILITY RANGE'
            ) : signals.readyToTrigger ? (
              '🟢 ALL 6 GATES OPEN · READY TO EXECUTE'
            ) : (
              '🟢 GATES CLEAR · SCANNING ENTRY'
            )}
          </span>
          <span className="font-mono text-slate-400 text-[10px] hidden md:inline">
            VR {signals.volumeRatio}x &bull; OFI {signals.imbalanceScore >= 0 ? '+' : ''}{signals.imbalanceScore.toFixed(0)}% &bull; BuyTape {signals.aggressiveBuyScore.toFixed(0)}% &bull; Net Target: +${(config.targetProfitUsd || 0.00004).toFixed(6)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {signals.blockingReasons.length > 0 && (
            <div className="text-[11px] text-amber-400 font-mono truncate max-w-sm hidden lg:inline">
              Note: {signals.blockingReasons[0]}
            </div>
          )}

          {onForceTrade && (
            <button
              onClick={onForceTrade}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-bold flex items-center gap-1 transition-all shadow-sm"
              title="Bypass wait gates and immediately place a 1-second scalp order on Bitfinex"
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>⚡ Execute Scalp Now</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
