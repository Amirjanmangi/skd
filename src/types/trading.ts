export interface Ticker {
  symbol: string;
  cleanSymbol: string;
  bid: number;
  bidSize: number;
  ask: number;
  askSize: number;
  dailyChange: number;
  dailyChangePerc: number;
  lastPrice: number;
  volume: number;
  high: number;
  low: number;
  spread: number;
  spreadBps: number;
  volatility: number;
  surgeScore?: number;
  surgeRank?: number;
  surgeStatus?: 'SURGING' | 'HIGH_MOMENTUM' | 'NEUTRAL' | 'SELLER_DUMP';
  best2MinScore?: number;
  twoMinViable?: boolean;
  minRequiredUsd?: number;
  isAffordable?: boolean;
  requiredMoveBps?: number;
  hasAggressiveSellers?: boolean;
  disqualifiedReason?: string;
}

export interface OrderBookLevel {
  price: number;
  count: number;
  amount: number;
  total: number;
}

export interface OrderBookWall {
  price: number;
  amount: number;
  distancePerc: number;
  multipleOfAvg: number;
}

export interface OrderBookData {
  symbol: string;
  timestamp: number;
  midPrice: number;
  topBid: number;
  topAsk: number;
  spread: number;
  spreadBps: number;
  microprice: number;
  micropriceDelta: number;
  imbalance5: number;
  imbalanceTotal: number;
  bidDepth5: number;
  askDepth5: number;
  totalBidDepth: number;
  totalAskDepth: number;
  obiRatio?: number; // Step 3: Total BidVolume / Total AskVolume
  obi5Ratio?: number; // Step 3: Top 5 Levels BidVolume / AskVolume
  sellWalls: OrderBookWall[];
  buyWalls: OrderBookWall[];
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface CandleItem {
  mts: number;
  time: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export interface CandlesData {
  symbol: string;
  timeframe: '15s' | '1m' | '5m';
  currentPrice: number;
  currentVolume: number;
  avgVolume20: number;
  volumeRatio: number;
  recent5High: number;
  isPriceBreakout: boolean;
  breakoutDeltaPerc: number;
  candles: CandleItem[];
}

export interface TradeItem {
  id: number;
  timestamp: number;
  time: string;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  usdValue: number;
}

export interface TradesData {
  symbol: string;
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
  tradeDelta: number;
  aggressiveBuyRatio: number;
  buyCount: number;
  sellCount: number;
  trades: TradeItem[];
}

export interface BotConfig {
  mode: 'simulation' | 'live';
  symbol: string;
  tradeSizeUsd: number; // e.g. $3.00
  targetProfitPercent: number; // e.g. 0.01333% (yielding $0.0004 on $3)
  targetProfitUsd: number; // e.g. $0.000400
  candleTimeframe: '15s' | '1m' | '5m'; // User timeframe
  minVolumeRatio: number; // Step 1: 1.5x, 2.0x, 3.0x, 5.0x (Default: 2.0x)
  minObiRatio: number; // Step 3: Default 1.5x (BidVolume / AskVolume)
  enforceSpreadFilter: boolean; // Step 4: Spread must be smaller than target move (0.01333%)
  maxHoldDurationMs: number;
  zeroFeeMode: boolean; // When true, maker/taker fee = 0.00%
  makerFeeRate: number; // e.g. 0.0010 (0.10%) or 0.0000
  takerFeeRate: number; // e.g. 0.0020 (0.20%) or 0.0000
  orderType: 'EXCHANGE MARKET' | 'EXCHANGE LIMIT';
  minImbalanceThreshold: number; // e.g. 20%
  minAggressiveBuyRatio: number; // e.g. 60%
  requireMicropricePremium: boolean;
  enforceFeeGuard: boolean;
  strictZeroLossStop: boolean; // When true, trades NEVER exit in negative loss (only profit or 0.0000 scratch)
  strictNoLoss: boolean; // Absolute no-loss: NEVER market-sell at a loss, hold spot coins until profit target is hit
  buyOnDipOnly: boolean; // Dip-Buyer: Wait for price to pull back/dip before buying, NEVER buy at peak
  dipThresholdBps: number; // Dip threshold in basis points (e.g. 5 bps)
  stopLossBps: number; // e.g. 6 bps
  continuousMode: boolean; // Continuous high-frequency loop (enters next scalp immediately after close)
  autoReentryDelayMs: number; // Delay between scalps (default 300ms)
  quoteCurrency: 'USD' | 'UST'; // User quote currency (USD or USDT/UST)
  multiCoinHunter: boolean; // Autonomous scanning across all volatile coins to scalp the surging coin
  autoScalpActive: boolean;
  apiKey: string;
  apiSecret: string;
}

export interface ActivePosition {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  currentPrice: number;
  amount: number;
  usdValue: number;
  entryTime: number;
  targetExitPrice: number;
  stopLossPrice: number;
  grossPnl: number;
  estimatedEntryFee: number;
  estimatedExitFee: number;
  totalFees: number;
  netPnl: number;
  status: 'OPEN' | 'CLOSING' | 'CLOSED';
  mode: 'simulation' | 'live';
  quoteCurrency?: 'USD' | 'UST';
  bitfinexOrderId?: number;
  realExitPrice?: number;
  realFeePaid?: number;
}

export interface ClosedTradeRecord {
  id: string;
  symbol: string;
  entryTime: number;
  exitTime: number;
  durationMs: number;
  entryPrice: number;
  exitPrice: number;
  amount: number;
  usdValue: number;
  grossPnl: number;
  totalFees: number;
  netPnl: number;
  reason: 'TARGET_PROFIT_HIT' | 'ZERO_LOSS_SCRATCH' | 'TIME_LIMIT_EXPIRED' | 'STOP_LOSS_GUARD' | 'MANUAL_CLOSE' | 'ORPHAN_SCRATCH';
  mode: 'simulation' | 'live';
  bitfinexTradeId?: number;
}

export interface HftSignals {
  // Step 1: Volume Ratio & 1-Second Momentum
  volumeRatio: number;
  avgVolume20: number;
  currentVolume: number;
  volumeRatioPass: boolean;
  volumeSpikeDetected: boolean;
  momentumScore: number;
  
  // Step 2: Price Breakout vs Dip Buying & Seller Exhaustion
  recent5High: number;
  isPriceBreakout: boolean;
  breakoutPass: boolean;
  dipDetected: boolean;
  dipPerc: number;
  isAtPeak: boolean;
  dipStatusText: string;
  upwardReversalConfirmed: boolean;
  upwardStatusText: string;
  sellerExhaustionConfirmed: boolean;
  sellerAggressionText: string;
  isSellersDumping: boolean;
  isSellersActive: boolean;
  estimatedSupportLevel: number;
  distanceToSupportPerc: number;
  bounceConfirmationScore: number;

  // Step 3: Order Book Imbalance (OBI) — Buyers vs Sellers Pressure
  obiRatio: number;
  obiPass: boolean;
  imbalanceScore: number;
  imbalancePass: boolean;

  // Step 4: Trade Flow / CVD (Cumulative Volume Delta)
  cvd: number;
  cvdDirection: 'AGGRESSIVE_BUYING' | 'AGGRESSIVE_SELLING' | 'ABSORPTION';
  aggressiveBuyScore: number;
  aggressiveSellScore: number;
  aggressiveBuyPass: boolean;

  // Step 5: VWAP / EMA Trend Filter
  vwap: number;
  vwapDeltaPerc: number;
  vwapTrend: 'ABOVE_VWAP_BULLISH' | 'BELOW_VWAP_BEARISH' | 'AT_VWAP_SUPPORT';
  ema9: number;
  ema21: number;
  emaTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  trendFilterPass: boolean;

  // Step 6: Micro-Price Movement (Next Tick Pressure)
  microprice: number;
  micropriceDelta: number;
  micropriceDeltaBps: number;
  micropricePass: boolean;
  nextTickPressure: 'UPWARD_PRESSURE' | 'DOWNWARD_PRESSURE' | 'NEUTRAL';

  // Fluctuation Bottom & Swing Channel (Neechay anay ka wait)
  fluctuationLow: number;
  fluctuationHigh: number;
  fluctuationPositionPerc: number; // 0% = rock bottom, 100% = peak
  isAtFluctuationBottom: boolean; // True if in lower 35% of channel
  fluctuationBottomText: string;
  aggressiveBuyersConfirmed: boolean;
  chartConfirmationPassed: boolean;

  // Execution Filter & 2-Min Post-Fee Viability
  spreadBps: number;
  targetMoveBps: number;
  spreadFilterPass: boolean;
  sellWallClearancePass: boolean;
  nearestSellWallDist: number;
  nearestSellWallSize: number;
  feeGuardPass: boolean;
  minPriceMoveNeededBps: number;
  expectedGrossEdgeBps: number;
  postFeeViableIn2Min: boolean;
  expected2MinProfitNetUsd: number;
  confluenceScore: number;
  readyToTrigger: boolean;
  blockingReasons: string[];
}

export interface LogEntry {
  id: string;
  timestamp: number;
  time: string;
  type: 'INFO' | 'SIGNAL' | 'EXECUTION' | 'PROFIT' | 'WARNING' | 'ERROR';
  message: string;
  details?: Record<string, any>;
}

export interface SpotWallet {
  currency: string;
  balance: number;
  available: number;
  type?: string;
  usdValue?: number;
  price?: number;
}

export interface AccountBalanceSummary {
  totalAccountNetWorthUsd: number;
  totalLiquidCash: number;
  totalExchangeCash: number;
  exchangeUsd: number;
  exchangeUst: number;
  totalFundingCash: number;
  totalMarginCash: number;
  totalCryptoHoldingsUsd: number;
  spotWallets: SpotWallet[];
  fundingWallets: SpotWallet[];
  marginWallets: SpotWallet[];
  allWallets: SpotWallet[];
}
