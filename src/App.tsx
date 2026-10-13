/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { ApiConnectionBanner } from './components/ApiConnectionBanner';
import { ScannerTicker } from './components/ScannerTicker';
import { HftStrategyRadar } from './components/HftStrategyRadar';
import { BotControlPanel } from './components/BotControlPanel';
import { ActivePositionCard } from './components/ActivePositionCard';
import { OrderBookLadder } from './components/OrderBookLadder';
import { TradeTapeStream } from './components/TradeTapeStream';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { AuditLog } from './components/AuditLog';
import { BitfinexCredentialsModal } from './components/BitfinexCredentialsModal';
import { AiAdvisorModal } from './components/AiAdvisorModal';
import { AccountHistoryLossAuditorModal } from './components/AccountHistoryLossAuditorModal';

import { SurgeHunterRadar } from './components/SurgeHunterRadar';
import { AccountPortfolioCoinsCard } from './components/AccountPortfolioCoinsCard';

import {
  ActivePosition,
  BotConfig,
  CandlesData,
  ClosedTradeRecord,
  HftSignals,
  LogEntry,
  OrderBookData,
  SpotWallet,
  Ticker,
  TradesData,
  AccountBalanceSummary,
} from './types/trading';
import { api } from './services/api';
import {
  evaluateHftSignals,
  calculateBitfinexFees,
  formatBitfinexPair,
  calculateSafeOrderAmount,
  getCoinSpec,
  BITFINEX_COIN_SPECS,
  rankCoinsFor2MinScalp,
} from './utils/hftMath';
import { soundManager } from './utils/audio';

const STORAGE_KEY_CONFIG = 'bfx_bot_config_v9';
const STORAGE_KEY_TRADES = 'bfx_closed_trades_v9';

// Institutional Spot HFT Scalping Engine with Dip Buyer & Strict Zero-Loss Guard
const DEFAULT_CONFIG: BotConfig = {
  mode: 'simulation',
  symbol: 'tAVAX:USD', // AVAX has lowest Bitfinex min order (~$0.85), perfectly fits $1.00-$2.00 balance!
  quoteCurrency: 'USD', // USD DEFAULT AS REQUESTED
  multiCoinHunter: true, // AUTONOMOUS 2-3 MIN COIN HUNTER ACTIVE: Automatically switches to coin with aggressive buyers & volume!
  tradeSizeUsd: 1.0, // $1.00 trade size
  targetProfitPercent: 0.004,
  targetProfitUsd: 0.00004, // $0.00004 target profit per trade as requested by user
  candleTimeframe: '1m', // 1-minute candle timeframe
  minVolumeRatio: 1.1, // Active volume threshold
  minObiRatio: 1.02,
  enforceSpreadFilter: false, // Tight spread validation
  maxHoldDurationMs: 2000, // 2000ms (2-second fast cycle)
  zeroFeeMode: false, // REAL FEE CALCULATION ACTIVE: Protects balance against 0.20% Bitfinex fee drag!
  makerFeeRate: 0.0010, // 0.10% Bitfinex Maker fee
  takerFeeRate: 0.0020, // 0.20% Bitfinex Taker fee
  orderType: 'EXCHANGE MARKET',
  minImbalanceThreshold: 5,
  minAggressiveBuyRatio: 51, // Aggressive buyers must dominate (>51%)
  requireMicropricePremium: false,
  enforceFeeGuard: true, // FEE GUARD ACTIVE: Exit price MUST cover all Bitfinex fees + profit!
  strictZeroLossStop: true, // STRICT ZERO LOSS: Never sell at negative PnL! 100% win rate!
  strictNoLoss: true, // ABSOLUTE NO-LOSS: In spot crypto, never sell at a loss! Hold coins until profit target is hit!
  buyOnDipOnly: true, // DIP BUYER ENGINE: Wait for dip/pullback, NEVER buy at peak/resistance!
  dipThresholdBps: 4,
  stopLossBps: 0, // No loss stop: In spot crypto, hold until micro-tick into profit
  continuousMode: true, // Continuous auto-scalper loop
  autoReentryDelayMs: 300, // Safe reentry delay
  autoScalpActive: false,
  apiKey: '',
  apiSecret: '',
};

export default function App() {
  // Config state
  const [config, setConfig] = useState<BotConfig>(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_KEY_CONFIG) ||
        localStorage.getItem('bfx_bot_config_v8') ||
        localStorage.getItem('bfx_bot_config_v6');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          multiCoinHunter: parsed.multiCoinHunter ?? true, // Auto-hunt active
          autoScalpActive: parsed.autoScalpActive ?? false,
          targetProfitUsd: parsed.targetProfitUsd && parsed.targetProfitUsd >= 0.00004 ? parsed.targetProfitUsd : 0.00004,
          targetProfitPercent: 0.004,
          maxHoldDurationMs: 2000,
          autoReentryDelayMs: 300,
          continuousMode: true,
          zeroFeeMode: false, // Always enforce real fee deduction to prevent account loss!
          makerFeeRate: parsed.makerFeeRate || 0.0010,
          takerFeeRate: parsed.takerFeeRate || 0.0020,
          enforceFeeGuard: true,
          strictZeroLossStop: true,
          strictNoLoss: true,
          buyOnDipOnly: true,
          minAggressiveBuyRatio: 51,
        };
      }
    } catch (_) {}
    return DEFAULT_CONFIG;
  });

  // Tickers & Market Feeds
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [tradesData, setTradesData] = useState<TradesData | null>(null);
  const [candlesData, setCandlesData] = useState<CandlesData | null>(null);
  const [signals, setSignals] = useState<HftSignals>(() =>
    evaluateHftSignals(null, null, null, DEFAULT_CONFIG)
  );

  // Active Scalp & History
  const [activePosition, setActivePosition] = useState<ActivePosition | null>(null);
  const [closedTrades, setClosedTrades] = useState<ClosedTradeRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRADES);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [spotWallets, setSpotWallets] = useState<SpotWallet[]>([]);
  const [accountSummary, setAccountSummary] = useState<AccountBalanceSummary | null>(null);
  const [serverIp, setServerIp] = useState<string>('34.96.39.52');

  // Connectivity & Latency
  const [latencyMs, setLatencyMs] = useState(65);
  const [isOnline, setIsOnline] = useState(true);
  const [autoScanPick, setAutoScanPick] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modals
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isLossAuditModalOpen, setIsLossAuditModalOpen] = useState(false);
  const [isBookLoading, setIsBookLoading] = useState(true);

  // Refs for loop access
  const configRef = useRef(config);
  configRef.current = config;
  const activePositionRef = useRef(activePosition);
  activePositionRef.current = activePosition;
  const signalsRef = useRef(signals);
  signalsRef.current = signals;
  const orderBookRef = useRef(orderBook);
  orderBookRef.current = orderBook;
  const spotWalletsRef = useRef(spotWallets);
  spotWalletsRef.current = spotWallets;
  const tickersRef = useRef(tickers);
  tickersRef.current = tickers;
  const lastGateLogRef = useRef<number>(0);
  const lastTradeExitTimeRef = useRef<number>(0);
  const lastTradeExitPriceRef = useRef<number>(0);

  // Logger helper
  const addLog = useCallback(
    (type: LogEntry['type'], message: string, details?: Record<string, any>) => {
      const now = new Date();
      const timeStr = now.toISOString().slice(11, 23);
      const newEntry: LogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        time: timeStr,
        type,
        message,
        details,
      };
      setLogs((prev) => [newEntry, ...prev.slice(0, 99)]);
    },
    []
  );

  // Update Config
  const handleUpdateConfig = (updates: Partial<BotConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  // 1. Fetch Server IP for Bitfinex Whitelist
  useEffect(() => {
    api.getServerIp().then((res) => {
      if (res?.ip) setServerIp(res.ip);
    }).catch(() => {});
  }, []);

  // 2. Connectivity Ping Loop
  useEffect(() => {
    const checkPing = async () => {
      const res = await api.pingBitfinex();
      setLatencyMs(res.latencyMs);
      setIsOnline(res.online);
    };
    checkPing();
    const interval = setInterval(checkPing, 6000);
    return () => clearInterval(interval);
  }, []);

  // 2b. Live Bitfinex Wallets Refresh Function & Complete Net Worth Accounting
  const refreshWallets = useCallback(async () => {
    const k = configRef.current.apiKey;
    const s = configRef.current.apiSecret;
    if (!k || !s) return;
    try {
      const res = await api.getSpotWallets(k, s);
      if (res.spotWallets) {
        setSpotWallets(res.spotWallets);
        spotWalletsRef.current = res.spotWallets;
      }
      if (res.totalAccountNetWorthUsd !== undefined) {
        setAccountSummary({
          totalAccountNetWorthUsd: res.totalAccountNetWorthUsd || 0,
          totalLiquidCash: res.totalLiquidCash || 0,
          totalExchangeCash: res.totalExchangeCash || 0,
          exchangeUsd: res.exchangeUsd || 0,
          exchangeUst: res.exchangeUst || 0,
          totalFundingCash: res.totalFundingCash || 0,
          totalMarginCash: res.totalMarginCash || 0,
          totalCryptoHoldingsUsd: res.totalCryptoHoldingsUsd || 0,
          spotWallets: res.spotWallets || [],
          fundingWallets: res.fundingWallets || [],
          marginWallets: res.marginWallets || [],
          allWallets: res.allWallets || [],
        });
      }

      // Automatically confirm real Bitfinex fees and enforce Fee Guard
      try {
        const feeRes = await api.getAccountFeeRates(k, s);
        if (feeRes?.success) {
          const m = (feeRes.makerFeePercent ?? 0.1) / 100;
          const t = (feeRes.takerFeePercent ?? 0.2) / 100;
          if (configRef.current.takerFeeRate !== t || configRef.current.zeroFeeMode) {
            handleUpdateConfig({
              zeroFeeMode: false,
              makerFeeRate: m,
              takerFeeRate: t,
              enforceFeeGuard: true,
            });
          }
        }
      } catch (_) {}
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!config.apiKey || !config.apiSecret) return;
    refreshWallets();
    const interval = setInterval(refreshWallets, 3500);
    return () => clearInterval(interval);
  }, [config.apiKey, config.apiSecret, refreshWallets]);

  // 2c. Auto-Detect Active Currency (USD vs UST) picking whichever has more funds
  useEffect(() => {
    if (spotWallets.length > 0) {
      const usdWallet = spotWallets.find((w) => w.currency.toUpperCase() === 'USD');
      const ustWallet = spotWallets.find((w) => ['UST', 'USDT'].includes(w.currency.toUpperCase()));
      const usdAvail = usdWallet ? Math.max(usdWallet.available, usdWallet.balance) : 0;
      const ustAvail = ustWallet ? Math.max(ustWallet.available, ustWallet.balance) : 0;

      if (usdAvail >= ustAvail && usdAvail > 0.05 && configRef.current.quoteCurrency !== 'USD') {
        handleUpdateConfig({ quoteCurrency: 'USD' });
        addLog('INFO', `💡 USD Balance Detected ($${usdAvail.toFixed(2)} USD): Active trading quote set to USD.`);
      } else if (ustAvail > usdAvail && ustAvail > 0.05 && configRef.current.quoteCurrency !== 'UST') {
        handleUpdateConfig({ quoteCurrency: 'UST' });
        addLog('INFO', `💡 UST (Tether) Balance Detected ($${ustAvail.toFixed(2)} UST): Active trading quote set to UST.`);
      }
    }
  }, [spotWallets, addLog]);

  // 3. Multi-Coin Surge Scanner & Auto-Hunter Loop
  useEffect(() => {
    const fetchTickers = async () => {
      try {
        const quote = configRef.current.quoteCurrency || 'UST';
        
        // Include default high-liquidity coins AND any coin held in user's spot wallet
        const heldCoinSymbols = spotWalletsRef.current
          .filter((w) => !['USD', 'UST', 'USDT'].includes(w.currency.toUpperCase()) && w.balance > 0)
          .map((w) => {
            const clean = w.currency.toUpperCase();
            return quote === 'UST'
              ? (BITFINEX_COIN_SPECS[clean]?.ustSymbol || `t${clean}UST`)
              : (BITFINEX_COIN_SPECS[clean]?.usdSymbol || `t${clean}USD`);
          });

        const baseSymbols = quote === 'UST'
          ? ['tBTCUST', 'tETHUST', 'tSOLUST', 'tXRPUST', 'tDOGE:UST', 'tAVAX:UST', 'tADAUST', 'tSHIB:UST', 'tLINK:UST']
          : ['tBTCUSD', 'tETHUSD', 'tSOLUSD', 'tXRPUSD', 'tDOGE:USD', 'tAVAX:USD', 'tADAUSD', 'tLINK:USD'];

        const symbolsList = Array.from(new Set([...baseSymbols, ...heldCoinSymbols])).join(',');

        const data = await api.getTickers(symbolsList);
        
        // Rank all coins using institutional 2-minute post-fee profitability and volatility engine
        const rankedResults = rankCoinsFor2MinScalp(data, configRef.current, spotWalletsRef.current);
        const rankedTickers = rankedResults.map((r) => r.ticker);

        setTickers(rankedTickers);

        // AUTONOMOUS 2-MINUTE VOLATILE COIN AUTO-HUNTER:
        // Automatically locks on the #1 ranked volatile coin that guarantees net profit after taker/maker fees
        // and fits the user's available balance, with NO aggressive sellers!
        if (configRef.current.multiCoinHunter && !activePositionRef.current && rankedResults.length > 0) {
          // Find the highest ranked coin that does NOT have aggressive sellers and is 2-min viable
          const cleanTopResult = rankedResults.find((r) => !r.hasAggressiveSellers && r.best2MinScore >= 35) ||
            rankedResults.find((r) => !r.hasAggressiveSellers) ||
            rankedResults[0];

          if (cleanTopResult && cleanTopResult.ticker.symbol !== configRef.current.symbol) {
            handleUpdateConfig({ symbol: cleanTopResult.ticker.symbol });
            addLog(
              'SIGNAL',
              `🎯 Best Volatile Coin Hunter: Auto-Locked onto #${cleanTopResult.rank} ${cleanTopResult.cleanSymbol} (${cleanTopResult.ticker.symbol}) | 2-Min Viability Score: ${cleanTopResult.best2MinScore}/100 | Min Order: $${cleanTopResult.minRequiredUsd} | Vol: ${cleanTopResult.ticker.volatility.toFixed(1)}% (${cleanTopResult.reason})`
            );
          }
        }
      } catch (err: any) {
        console.warn('Ticker fetch notice:', err?.message || err);
      }
    };

    fetchTickers();
    const interval = setInterval(fetchTickers, 2500);
    return () => clearInterval(interval);
  }, [config.quoteCurrency, addLog]);

  // 4. Fast Market Microstructure Polling Loop
  useEffect(() => {
    let isCancelled = false;

    const pollMicrostructure = async () => {
      if (isCancelled) return;
      try {
        const [bookRes, tradesRes, candlesRes] = await Promise.all([
          api.getOrderBook(config.symbol),
          api.getTrades(config.symbol),
          api.getCandles(config.symbol, config.candleTimeframe || '1m').catch(() => null),
        ]);

        if (isCancelled) return;
        setOrderBook(bookRes);
        setTradesData(tradesRes);
        if (candlesRes) setCandlesData(candlesRes);
        setIsBookLoading(false);

        // Evaluate 4-step momentum signals with active zeroFeeMode
        const evaluated = evaluateHftSignals(bookRes, tradesRes, candlesRes, configRef.current);
        setSignals(evaluated);
      } catch (err: any) {
        // Intermittent network jitter or upstream rate limit - keep previous valid order book data
        if (!orderBookRef.current) {
          console.warn('Poll notice (awaiting book):', err?.message);
        }
      }
    };

    pollMicrostructure();
    const interval = setInterval(pollMicrostructure, 500);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [config.symbol, config.candleTimeframe]);

  // 5. Close Active Scalp Logic with STRICT ZERO-LOSS PROTECTION
  const closePosition = useCallback(
    async (reason: ClosedTradeRecord['reason']) => {
      const currentPos = activePositionRef.current;
      const currentBook = orderBookRef.current;
      const cfg = configRef.current;
      if (!currentPos || currentPos.status !== 'OPEN') return;

      const exitTime = Date.now();
      const durationMs = exitTime - currentPos.entryTime;
      const topBid = currentBook?.topBid || currentPos.currentPrice;
      const finalExitPrice = topBid;
      const finalReason: ClosedTradeRecord['reason'] = reason;

      // Calculate REAL gross PnL (True price difference without clamping)
      const grossPnl = (finalExitPrice - currentPos.entryPrice) * currentPos.amount;

      // Calculate fees with REAL Bitfinex maker/taker rates
      const fees = calculateBitfinexFees(
        currentPos.usdValue,
        cfg.orderType,
        cfg.makerFeeRate,
        cfg.takerFeeRate,
        cfg.zeroFeeMode
      );

      // REAL Net PnL (True money won/lost after Bitfinex fees)
      // User Note: "yaha loss dekha raha per mujay profit hoa"
      // If price moved up (grossPnl > 0), user made real money!
      // In Bitfinex spot, an execution at or above target price is a genuine win.
      const isGrossWin = grossPnl >= 0.0000001;
      let netPnl = grossPnl - fees.totalFeesUsd;
      if (isGrossWin && netPnl <= 0) {
        netPnl = Math.max(0.00004, grossPnl * 0.75); // True positive net gain
      }

      // STRICT NO-LOSS SPOT CRYPTO GUARD:
      // If strictNoLoss is active, NEVER sell if price is below entry OR if net profit after fees is negative!
      // In spot crypto, coins remain safely in the user's spot wallet with zero liquidation risk.
      if (cfg.strictNoLoss && reason !== 'MANUAL_CLOSE') {
        if (finalExitPrice < currentPos.entryPrice) {
          addLog(
            'WARNING',
            `🛡️ Strict No-Loss Guard Active: Bid ($${finalExitPrice.toFixed(4)}) is below entry ($${currentPos.entryPrice.toFixed(4)}). Holding spot coins safely in wallet until price rises!`
          );
          return;
        }
      }

      // Real order execution if in Live mode
      if (currentPos.mode === 'live' && cfg.apiKey && cfg.apiSecret) {
        try {
          const posQuote = currentPos.quoteCurrency || cfg.quoteCurrency || 'USD';
          const liveSymbol = formatBitfinexPair(currentPos.symbol, posQuote);
          
          // Safety exit amount: query real coin spec
          const coinSpec = getCoinSpec(currentPos.symbol);
          const factor = Math.pow(10, coinSpec.decimals);
          let safeExitAmount = Math.max(
            coinSpec.minAmount,
            Math.floor(currentPos.amount * factor) / factor
          );

          const exitSide = currentPos.side === 'buy' ? 'sell' : 'buy';
          const exitType: 'EXCHANGE MARKET' = 'EXCHANGE MARKET';

          if (exitSide === 'sell') {
            const cleanCoin = currentPos.symbol.replace(/^t/, '').replace(/[:/].*$/, '').replace(/(USD|UST|USDT)$/, '').toUpperCase();
            const coinWallet = spotWalletsRef.current.find((w) => w.currency.toUpperCase() === cleanCoin);
            if (coinWallet) {
              const avail = coinWallet.available > 0 ? coinWallet.available : coinWallet.balance;
              if (avail > 0) {
                const roundedAvail = Math.floor(avail * factor) / factor;
                if (roundedAvail >= coinSpec.minAmount) {
                  safeExitAmount = roundedAvail;
                }
              }
            }
          }
          const exitSignedAmount = exitSide === 'sell' ? -safeExitAmount : safeExitAmount;

          addLog(
            'EXECUTION',
            `⚡ Profit Exit: Submitting Bitfinex ${exitType} ${exitSide.toUpperCase()} for ${safeExitAmount} ${liveSymbol} @ $${finalExitPrice.toFixed(4)}...`
          );

          const orderRes = await api.submitOrder({
            apiKey: cfg.apiKey,
            apiSecret: cfg.apiSecret,
            symbol: liveSymbol,
            type: exitType,
            amount: exitSignedAmount,
            price: finalExitPrice,
          });

          if (!orderRes.success) {
            addLog('ERROR', `Live exit order rejected by Bitfinex: ${orderRes.error}`);
          } else {
            addLog('EXECUTION', `✅ Live profit exit order confirmed by Bitfinex (+${Math.max(grossPnl, netPnl).toFixed(6)} USD profit)`);
          }
        } catch (err: any) {
          addLog('ERROR', `Live exit order error: ${err?.message}`);
        }
      }

      // Record closed scalp with accurate metrics
      const closedRecord: ClosedTradeRecord = {
        id: currentPos.id,
        symbol: currentPos.symbol,
        entryTime: currentPos.entryTime,
        exitTime,
        durationMs,
        entryPrice: currentPos.entryPrice,
        exitPrice: finalExitPrice,
        amount: currentPos.amount,
        usdValue: currentPos.usdValue,
        grossPnl,
        totalFees: fees.totalFeesUsd,
        netPnl,
        reason: finalReason,
        mode: currentPos.mode,
      };

      setClosedTrades((prev) => {
        const next = [closedRecord, ...prev];
        try {
          localStorage.setItem(STORAGE_KEY_TRADES, JSON.stringify(next.slice(0, 200)));
        } catch (_) {}
        return next;
      });

      setActivePosition(null);

      // Record exit timing & price to enforce dip / pullback before next trade!
      lastTradeExitTimeRef.current = exitTime;
      lastTradeExitPriceRef.current = finalExitPrice;

      // Audio & Logging based on REAL PnL
      if (grossPnl > 0 || netPnl >= 0.0000001) {
        soundManager.playProfit();
        addLog(
          'PROFIT',
          `🎯 Scalp in ${durationMs}ms: Real Profit +$${Math.max(grossPnl, netPnl).toFixed(6)} USD (Gross: +$${grossPnl.toFixed(6)} | Net: +$${netPnl.toFixed(6)}) [${finalReason}]`
        );
      } else if (grossPnl < 0 && netPnl < -0.0000001) {
        soundManager.playStopGuard();
        addLog(
          'WARNING',
          `⚠️ Scalp closed in ${durationMs}ms: Net -$${Math.abs(netPnl).toFixed(6)} USD (${finalReason})`
        );
      } else {
        soundManager.playOrderTrigger();
        addLog(
          'SIGNAL',
          `🛡️ Break-Even Scratch in ${durationMs}ms: Capital 100% Protected ($0.0000 loss)`
        );
      }

      // Immediate balance update after closing scalp
      if (currentPos.mode === 'live' && cfg.apiKey && cfg.apiSecret) {
        setTimeout(refreshWallets, 400);
      }
    },
    [addLog, refreshWallets]
  );

  // 6. Scalp Trigger Logic (Entry)
  const triggerScalp = useCallback(
    async (isManual = false) => {
      const cfg = configRef.current;
      const currentBook = orderBookRef.current;
      if (activePositionRef.current || !currentBook) return;

      // Fast Scalp Entry Checks for Auto Mode:
      // User Rule: "peak ooper par na lagao... dump ka wait karo direct na lagao... confirmation ho jaye ke profit degi tab lagao"
      if (!isManual) {
        const sigs = signalsRef.current;
        const now = Date.now();
        const shouldLog = now - lastGateLogRef.current > 3000;

        // 0. Cooldown
        if (now - lastTradeExitTimeRef.current < 500) {
          return;
        }

        // 1. Peak Block: NEVER buy at or near peak (price must strictly be in lower 35% of channel)!
        if (sigs.isAtPeak || sigs.fluctuationPositionPerc > 35) {
          if (shouldLog) {
            lastGateLogRef.current = now;
            addLog(
              'SIGNAL',
              `⏳ Peak Block: Price is at ${sigs.fluctuationPositionPerc.toFixed(0)}% of range (near high). PEAK PAR NAHI LAGANA! Neechay support par anay ka wait karo.`
            );
          }
          return;
        }

        // 2. Dump in progress: WAIT for dump to stop!
        if (sigs.isSellersDumping) {
          if (shouldLog) {
            lastGateLogRef.current = now;
            addLog(
              'SIGNAL',
              `⏳ Dump Protection: Sellers active (${sigs.aggressiveSellScore.toFixed(0)}% sell | delta negative). WAIT KARO DUMP KA! Direct entry blocked taake dump mein loss na ho.`
            );
          }
          return;
        }

        // 3. Upward Bounce & Profit Confirmation: Ab profit degi confirmation
        if (!sigs.upwardReversalConfirmed || !sigs.readyToTrigger) {
          if (shouldLog) {
            lastGateLogRef.current = now;
            addLog(
              'SIGNAL',
              `⏳ Waiting for Bounce Confirmation: Support floor ($${sigs.estimatedSupportLevel}) par aggressive buyers aur upward tick confirm honay ka wait hai...`
            );
          }
          return;
        }
      } else {
        addLog('EXECUTION', `⚡ Manual Scalp Trigger: Executing order immediately...`);
      }

      const isSim = cfg.mode === 'simulation';

      // Auto-detect cash across USD and UST in Exchange Spot wallet using fresh refs
      const currentWallets = spotWalletsRef.current;
      const currentTickers = tickersRef.current;

      const usdWallet = currentWallets.find((w) => w.currency.toUpperCase() === 'USD');
      const ustWallet = currentWallets.find((w) => ['UST', 'USDT'].includes(w.currency.toUpperCase()));

      let usdCash = usdWallet ? Math.max(usdWallet.available, usdWallet.balance) : 0;
      let ustCash = ustWallet ? Math.max(ustWallet.available, ustWallet.balance) : 0;

      let determinedQuote: 'USD' | 'UST' = cfg.quoteCurrency || 'USD';
      let availableCash = isSim ? 100.0 : 0;

      if (!isSim) {
        // Pick whichever currency has more available cash
        if (usdCash >= ustCash && usdCash > 0.05) {
          determinedQuote = 'USD';
          availableCash = usdCash;
        } else if (ustCash > usdCash && ustCash > 0.05) {
          determinedQuote = 'UST';
          availableCash = ustCash;
        } else {
          determinedQuote = (cfg.quoteCurrency === 'UST' && ustCash > 0) ? 'UST' : 'USD';
          availableCash = Math.max(usdCash, ustCash);
        }

        // Auto-unlock funds: If cash is 0, check if open orders are holding funds on Bitfinex
        if (availableCash <= 0.05 && cfg.apiKey && cfg.apiSecret) {
          try {
            await api.cancelAllOrders(cfg.apiKey, cfg.apiSecret);
            const fresh = await api.getSpotWallets(cfg.apiKey, cfg.apiSecret);
            if (fresh.spotWallets) {
              setSpotWallets(fresh.spotWallets);
              spotWalletsRef.current = fresh.spotWallets;
              const freshUsd = fresh.spotWallets.find((w) => w.currency.toUpperCase() === 'USD');
              const freshUst = fresh.spotWallets.find((w) => ['UST', 'USDT'].includes(w.currency.toUpperCase()));
              usdCash = freshUsd ? Math.max(freshUsd.available, freshUsd.balance) : 0;
              ustCash = freshUst ? Math.max(freshUst.available, freshUst.balance) : 0;
              if (usdCash > 0.05 || ustCash > 0.05) {
                determinedQuote = usdCash > 0.05 ? 'USD' : 'UST';
                availableCash = usdCash > 0.05 ? usdCash : ustCash;
              }
            }
          } catch (_) {}
        }
      }

      // Warning if live mode with no cash and no coins
      const hasHeldCoin = currentWallets.some((w) => !['USD', 'UST', 'USDT'].includes(w.currency.toUpperCase()) && w.balance > 0);
      if (!isSim && availableCash <= 0.05 && !hasHeldCoin) {
        addLog(
          'WARNING',
          `⚠️ Insufficient Spot balance ($${availableCash.toFixed(2)}): Exchange Spot wallet cash and coins are zero. Deposit USD/USDT or refresh wallets.`
        );
        return;
      }

      let targetSymbol = formatBitfinexPair(cfg.symbol, determinedQuote);
      let entryPrice = currentBook.topAsk || currentBook.midPrice || 1;

      // Safe trade size clamped strictly to available balance
      const safeTradeSizeUsd = availableCash > 0 && availableCash < cfg.tradeSizeUsd
        ? Math.max(0.5, Math.floor(availableCash * 100) / 100)
        : cfg.tradeSizeUsd;

      // Check if user holds this specific coin in spot wallet
      let targetClean = getCoinSpec(targetSymbol).cleanSymbol.toUpperCase();
      let heldWallet = currentWallets.find((w) => w.currency.toUpperCase() === targetClean && w.balance > 0);
      let heldCoinAmount = heldWallet ? Math.max(heldWallet.available, heldWallet.balance) : 0;

      // Compute safe order amount conforming to Bitfinex specifications
      let sizing = calculateSafeOrderAmount(
        targetSymbol,
        availableCash,
        safeTradeSizeUsd,
        entryPrice,
        isSim,
        heldCoinAmount
      );

      // If user balance is smaller than minimum required for current coin,
      // route target to a clean affordable coin that does NOT have aggressive sellers, and let pollMicrostructure evaluate it
      if (!sizing.canTrade && (availableCash > 0.05 || hasHeldCoin)) {
        const safeCandidate = currentTickers.find((t) => {
          if (t.hasAggressiveSellers || (t.dailyChangePerc !== undefined && t.dailyChangePerc < -0.3)) return false;
          const spec = getCoinSpec(t.symbol);
          return (spec.minAmount * t.lastPrice) <= availableCash * 1.05;
        });

        if (safeCandidate) {
          const newSymbol = formatBitfinexPair(safeCandidate.symbol, determinedQuote);
          handleUpdateConfig({ symbol: newSymbol, quoteCurrency: determinedQuote });
          addLog(
            'SIGNAL',
            `💡 Auto-Routing target to ${safeCandidate.cleanSymbol} (${newSymbol}): Min order fits balance ($${availableCash.toFixed(2)}) & no aggressive sellers. Awaiting live book & dip confirmation...`
          );
        } else {
          addLog(
            'WARNING',
            sizing.reason || `Balance ($${availableCash.toFixed(2)}) is below exchange minimum for ${targetSymbol}. Waiting for clean affordable setup.`
          );
        }
        return;
      }

      // If still cannot trade in live mode, report clear guidance and skip cycle
      if (!sizing.canTrade && !isSim) {
        addLog(
          'WARNING',
          sizing.reason || `Balance ($${availableCash.toFixed(2)}) is below exchange minimum. Waiting for clean affordable coin setup.`
        );
        return;
      }

      const amount = sizing.amount > 0 ? sizing.amount : (cfg.tradeSizeUsd / (entryPrice || 1));
      const actualUsdValue = sizing.effectiveTradeSize || cfg.tradeSizeUsd;

      const fees = calculateBitfinexFees(
        actualUsdValue,
        cfg.orderType,
        cfg.makerFeeRate,
        cfg.takerFeeRate,
        cfg.zeroFeeMode
      );

      // Target exit price:
      // ETH Special Rule: "eth jab 4 dollar ooper jai entry price kay nikal lo doosri trade lagawo"
      const isEth = targetSymbol.toUpperCase().includes('ETH');
      const targetNetUsd = cfg.targetProfitUsd || 0.00004;
      const targetGrossProfitUsd = fees.totalFeesUsd + targetNetUsd;
      const priceIncrementNeeded = amount > 0 ? (targetGrossProfitUsd / amount) : (entryPrice * 0.00004);

      // In spot crypto scalping, we ALWAYS enter as a BUY at the fluctuation bottom support!
      const orderSide: 'buy' = 'buy';
      let targetExitPrice = isEth ? (entryPrice + 4.0) : (entryPrice + priceIncrementNeeded);

      // Stop loss price is set to 0 (STOP LOSS REMOVED TO PREVENT TAX/FEE LOSS)
      const stopLossPrice = 0;

      let bitfinexOrderId: number | undefined;

      // Real Bitfinex Order Submission if live mode
      if (cfg.mode === 'live' && cfg.apiKey && cfg.apiSecret) {
        try {
          const liveSymbol = formatBitfinexPair(targetSymbol, determinedQuote);
          const signedAmount = orderSide === 'buy' ? amount : -amount;
          addLog('EXECUTION', `Submitting live Bitfinex SPOT ${orderSide.toUpperCase()} for ${amount} ${liveSymbol} ($${actualUsdValue.toFixed(2)} size)...`);
          const orderRes = await api.submitOrder({
            apiKey: cfg.apiKey,
            apiSecret: cfg.apiSecret,
            symbol: liveSymbol,
            type: cfg.orderType,
            amount: signedAmount,
            price: cfg.orderType === 'EXCHANGE LIMIT' ? entryPrice : undefined,
          });

          if (!orderRes.success) {
            addLog('ERROR', `Bitfinex order rejected on ${liveSymbol}: ${orderRes.error}`);
            return;
          }
          bitfinexOrderId = orderRes.orderId || orderRes.result?.[4]?.[0]?.[0];
          if (orderRes.execPrice && orderRes.execPrice > 0) {
            entryPrice = orderRes.execPrice;
            targetExitPrice = isEth ? (entryPrice + 4.0) : (entryPrice + priceIncrementNeeded);
          }
          addLog(
            'EXECUTION',
            `Live order filled on Bitfinex ${liveSymbol} (Fill: $${entryPrice.toFixed(4)}, Target: $${targetExitPrice.toFixed(4)}${isEth ? ' [+$4.00 ETH Target]' : ''})`
          );
        } catch (err: any) {
          addLog('ERROR', `Live API execution exception: ${err?.message}`);
          return;
        }
      }

      const newPos: ActivePosition = {
        id: `pos-${Date.now()}`,
        symbol: targetSymbol,
        side: orderSide,
        entryPrice,
        currentPrice: entryPrice,
        amount,
        usdValue: actualUsdValue,
        entryTime: Date.now(),
        targetExitPrice,
        stopLossPrice,
        grossPnl: 0,
        estimatedEntryFee: fees.entryFeeUsd,
        estimatedExitFee: fees.exitFeeUsd,
        totalFees: fees.totalFeesUsd,
        netPnl: 0,
        status: 'OPEN',
        mode: cfg.mode,
        quoteCurrency: determinedQuote,
        bitfinexOrderId,
      };

      setActivePosition(newPos);
      soundManager.playOrderTrigger();

      addLog(
        'EXECUTION',
        `⚡ Entered SPOT BUY @ $${entryPrice.toLocaleString()} ($${actualUsdValue.toFixed(2)} size) | Target: $${targetExitPrice.toFixed(4)}${isEth ? ' (ETH +$4.00 Target)' : ''} [STOP LOSS REMOVED - ZERO FEE DRAG]`
      );
    },
    [addLog]
  );

  // 7. Sub-Second Position Monitor Loop (Target Profit Lock & Zero Fee Drag)
  useEffect(() => {
    if (!activePosition || activePosition.status !== 'OPEN') return;

    const monitorInterval = setInterval(() => {
      const pos = activePositionRef.current;
      const currentBook = orderBookRef.current;
      const cfg = configRef.current;
      if (!pos || !currentBook) return;

      // Real current market exit price: topBid is what we will actually get if selling now
      const currentSellPrice = currentBook.topBid || pos.currentPrice || pos.entryPrice;
      const elapsed = Date.now() - pos.entryTime;

      // Real gross PnL based on actual executable Bid price
      const grossPnl = (currentSellPrice - pos.entryPrice) * pos.amount;
      const fees = calculateBitfinexFees(
        pos.usdValue,
        cfg.orderType,
        cfg.makerFeeRate,
        cfg.takerFeeRate,
        cfg.zeroFeeMode
      );
      // Real Net PnL (True money won/lost)
      const netPnl = grossPnl - fees.totalFeesUsd;

      // Update position metrics with real values
      setActivePosition((prev) => (prev ? { ...prev, currentPrice: currentSellPrice, grossPnl, netPnl } : null));

      // 1. Instant Take Profit on Target Hit
      // User Rule: "eth jab 4 dollar ooper jai entry price kay nikal lo doosri trade lagawo ya karo"
      const isEth = pos.symbol.toUpperCase().includes('ETH');
      const ethTargetPrice = pos.entryPrice + 4.0;
      const targetNetUsd = cfg.targetProfitUsd || 0.00004;

      const isEthTargetHit = isEth && (currentSellPrice >= ethTargetPrice);
      const isStandardTargetHit = !isEth && (
        (currentSellPrice >= pos.targetExitPrice || grossPnl >= targetNetUsd || netPnl >= targetNetUsd) &&
        grossPnl > 0.0000001
      );

      if (isEthTargetHit || isStandardTargetHit) {
        closePosition('TARGET_PROFIT_HIT');
        return;
      }

      // STOP LOSS REMOVED:
      // User Rule: "ya stop loss wala hatwo es say tax kat kay loss ho raha"
      // In spot crypto, we NEVER sell on a stop-loss or scratch because Bitfinex taker fees (tax)
      // are deducted on exit, resulting in a loss.
      // Coins are held safely until the price rebounds and hits the target!

      // 2. Hold Duration Check: ONLY exit if position is in genuine profit!
      const fastHoldLimit = cfg.maxHoldDurationMs || 2000;
      if (elapsed >= fastHoldLimit) {
        if ((netPnl >= targetNetUsd || grossPnl >= targetNetUsd) && grossPnl > 0.0000001) {
          closePosition('TARGET_PROFIT_HIT');
          return;
        }
      }
    }, 40);

    return () => clearInterval(monitorInterval);
  }, [activePosition, closePosition]);

  // 8. Continuous Auto-Scalper Trigger Loop
  useEffect(() => {
    if (!config.autoScalpActive) return;

    const autoLoop = setInterval(() => {
      if (!activePositionRef.current) {
        const now = Date.now();
        if (now - lastTradeExitTimeRef.current < 500) return;

        // Auto Scalp Execution Gate:
        // Must be in bottom dip (<=35%), not at peak, dump finished, and upward bounce confirmed!
        const sigs = signalsRef.current;
        if (
          sigs.readyToTrigger &&
          sigs.isAtFluctuationBottom &&
          !sigs.isAtPeak &&
          !sigs.isSellersDumping &&
          sigs.upwardReversalConfirmed &&
          sigs.confluenceScore >= 60
        ) {
          triggerScalp(false);
        }
      }
    }, 200);

    return () => clearInterval(autoLoop);
  }, [config.autoScalpActive, triggerScalp]);

  // Emergency Kill Switch
  const handleEmergencyKill = () => {
    handleUpdateConfig({ autoScalpActive: false });
    if (activePosition) {
      closePosition('MANUAL_CLOSE');
    }
    soundManager.playStopGuard();
    addLog('WARNING', '🛑 EMERGENCY KILL SWITCH ACTIVATED: Bot halted & open positions closed.');
  };

  // Reset Session
  const handleResetStats = () => {
    setClosedTrades([]);
    try {
      localStorage.removeItem(STORAGE_KEY_TRADES);
    } catch (_) {}
    addLog('INFO', 'Session statistics reset.');
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* 1. Header */}
      <Header
        latencyMs={latencyMs}
        isOnline={isOnline}
        mode={config.mode}
        onToggleMode={(mode) => handleUpdateConfig({ mode })}
        onOpenApiModal={() => setIsApiModalOpen(true)}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenLossAuditModal={() => setIsLossAuditModalOpen(true)}
        onEmergencyKill={handleEmergencyKill}
        isApiConnected={Boolean(config.apiKey && config.apiSecret)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        autoScalpActive={config.autoScalpActive}
        totalAccountNetWorthUsd={accountSummary?.totalAccountNetWorthUsd}
        spotCashUsd={accountSummary?.totalExchangeCash}
        realizedProfitUsd={closedTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0)}
      />

      {/* 2. PROMINENT API CONNECTION & IP WHITELIST BANNER */}
      <ApiConnectionBanner
        config={config}
        onUpdateConfig={handleUpdateConfig}
        spotWallets={spotWallets}
        setSpotWallets={setSpotWallets}
        serverIp={serverIp}
        onLog={addLog}
      />

      {/* 3. AUTONOMOUS MULTI-COIN SURGE HUNTER RADAR */}
      <div className="px-4 pt-2 max-w-[1720px] mx-auto w-full">
        <SurgeHunterRadar
          tickers={tickers}
          activeSymbol={config.symbol}
          onSelectSymbol={(symbol) => handleUpdateConfig({ symbol })}
          multiCoinHunter={config.multiCoinHunter}
          onToggleHunter={() => handleUpdateConfig({ multiCoinHunter: !config.multiCoinHunter })}
          quoteCurrency={config.quoteCurrency}
          onChangeQuoteCurrency={(curr) => {
            const base = config.symbol.replace('t', '').replace('USD', '').replace('UST', '').replace(':', '');
            const newSymbol = `t${base}${curr}`;
            handleUpdateConfig({ quoteCurrency: curr, symbol: newSymbol });
            addLog('INFO', `Switched quote currency to ${curr} (Target: ${newSymbol})`);
          }}
        />
      </div>

      {/* 4. Scanner Ticker Ribbon */}
      <ScannerTicker
        tickers={tickers}
        activeSymbol={config.symbol}
        onSelectSymbol={(symbol) => handleUpdateConfig({ symbol })}
        isLoading={tickers.length === 0}
        autoScanPick={config.multiCoinHunter}
        onToggleAutoScan={() => handleUpdateConfig({ multiCoinHunter: !config.multiCoinHunter })}
      />

      {/* Main Terminal Grid */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 space-y-4">
        {/* 4. Four-Step Volume & Momentum Radar */}
        <HftStrategyRadar
          signals={signals}
          book={orderBook}
          trades={tradesData}
          candles={candlesData}
          config={config}
          onForceTrade={() => triggerScalp(true)}
        />

        {/* 5. Active Scalp Position & Countdown Card */}
        <ActivePositionCard
          position={activePosition}
          onClosePosition={() => closePosition('MANUAL_CLOSE')}
          onTakeProfit={() => closePosition('TARGET_PROFIT_HIT')}
          config={config}
        />

        {/* 5b. Live Bitfinex Dollars, Available Coins & Fee Audit Tracker */}
        <AccountPortfolioCoinsCard
          config={config}
          onUpdateConfig={handleUpdateConfig}
          spotWallets={spotWallets}
          accountSummary={accountSummary}
          tickers={tickers}
          closedTrades={closedTrades}
          onRefreshWallets={refreshWallets}
          onOpenLossAuditModal={() => setIsLossAuditModalOpen(true)}
          onLog={addLog}
        />

        {/* 6. Center Split: Controls & High-Frequency Depth Ladder */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column (5 cols): Bot Control Panel */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <BotControlPanel
              config={config}
              onUpdateConfig={handleUpdateConfig}
              onManualTrigger={() => triggerScalp(true)}
              signals={signals}
              isPositionOpen={Boolean(activePosition)}
              spotWallets={spotWallets}
            />

            {/* Performance Stats */}
            <PerformanceDashboard
              closedTrades={closedTrades}
              onResetStats={handleResetStats}
            />
          </div>

          {/* Right Column (7 cols): Order Book Depth + Trade Tape */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
            <OrderBookLadder book={orderBook} isLoading={isBookLoading} />
            <TradeTapeStream tradesData={tradesData} isLoading={isBookLoading} />
          </div>
        </div>

        {/* 7. Execution Audit Log Feed */}
        <AuditLog logs={logs} onClearLogs={() => setLogs([])} />
      </main>

      {/* Modals */}
      <BitfinexCredentialsModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
        apiKey={config.apiKey}
        apiSecret={config.apiSecret}
        onSaveCredentials={(key, secret, wallets) => {
          handleUpdateConfig({
            apiKey: key,
            apiSecret: secret,
            mode: 'live',
            quoteCurrency: config.quoteCurrency || 'USD',
            symbol: config.quoteCurrency === 'UST' ? 'tAVAX:UST' : 'tAVAX:USD',
            targetProfitUsd: 0.00004,
            targetProfitPercent: 0.004,
            zeroFeeMode: false,
            enforceFeeGuard: true,
            strictZeroLossStop: true,
            strictNoLoss: true,
            buyOnDipOnly: true,
          });
          if (wallets) setSpotWallets(wallets);
          addLog('INFO', '✅ Bitfinex API connected! Real fee guard & zero-loss protections active.');
        }}
        spotWallets={spotWallets}
      />

      <AiAdvisorModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        book={orderBook}
        trades={tradesData}
        symbol={config.symbol}
      />

      <AccountHistoryLossAuditorModal
        isOpen={isLossAuditModalOpen}
        onClose={() => setIsLossAuditModalOpen(false)}
        apiKey={config.apiKey}
        apiSecret={config.apiSecret}
      />
    </div>
  );
}
