import { BotConfig, HftSignals, OrderBookData, TradesData, CandlesData, Ticker, SpotWallet } from '../types/trading';

export interface CoinSpec {
  cleanSymbol: string;
  usdSymbol: string;
  ustSymbol: string;
  minAmount: number;
  decimals: number;
  minApproxUsd: number;
}

export const BITFINEX_COIN_SPECS: Record<string, CoinSpec> = {
  BTC: {
    cleanSymbol: 'BTC',
    usdSymbol: 'tBTCUSD',
    ustSymbol: 'tBTCUST',
    minAmount: 0.00004,
    decimals: 8,
    minApproxUsd: 3.35,
  },
  ETH: {
    cleanSymbol: 'ETH',
    usdSymbol: 'tETHUSD',
    ustSymbol: 'tETHUST',
    minAmount: 0.0008,
    decimals: 6,
    minApproxUsd: 2.05,
  },
  SOL: {
    cleanSymbol: 'SOL',
    usdSymbol: 'tSOLUSD',
    ustSymbol: 'tSOLUST',
    minAmount: 0.02,
    decimals: 4,
    minApproxUsd: 2.22,
  },
  DOGE: {
    cleanSymbol: 'DOGE',
    usdSymbol: 'tDOGE:USD',
    ustSymbol: 'tDOGE:UST',
    minAmount: 22.0,
    decimals: 1,
    minApproxUsd: 1.87,
  },
  AVAX: {
    cleanSymbol: 'AVAX',
    usdSymbol: 'tAVAX:USD',
    ustSymbol: 'tAVAX:UST',
    minAmount: 0.08,
    decimals: 2,
    minApproxUsd: 0.85,
  },
  ADA: {
    cleanSymbol: 'ADA',
    usdSymbol: 'tADAUSD',
    ustSymbol: 'tADAUST',
    minAmount: 4.0,
    decimals: 2,
    minApproxUsd: 0.98,
  },
  SHIB: {
    cleanSymbol: 'SHIB',
    usdSymbol: 'tSHIB:USD',
    ustSymbol: 'tSHIB:UST',
    minAmount: 141010.0,
    decimals: 0,
    minApproxUsd: 0.75,
  },
  LINK: {
    cleanSymbol: 'LINK',
    usdSymbol: 'tLINK:USD',
    ustSymbol: 'tLINK:UST',
    minAmount: 0.2,
    decimals: 3,
    minApproxUsd: 2.65,
  },
  XRP: {
    cleanSymbol: 'XRP',
    usdSymbol: 'tXRPUSD',
    ustSymbol: 'tXRPUST',
    minAmount: 4.0,
    decimals: 2,
    minApproxUsd: 5.62,
  },
  TRX: {
    cleanSymbol: 'TRX',
    usdSymbol: 'tTRXUSD',
    ustSymbol: 'tTRXUST',
    minAmount: 4.0,
    decimals: 2,
    minApproxUsd: 0.90,
  },
  LTC: {
    cleanSymbol: 'LTC',
    usdSymbol: 'tLTCUSD',
    ustSymbol: 'tLTCUST',
    minAmount: 0.04,
    decimals: 4,
    minApproxUsd: 2.80,
  },
  NEAR: {
    cleanSymbol: 'NEAR',
    usdSymbol: 'tNEAR:USD',
    ustSymbol: 'tNEAR:UST',
    minAmount: 0.4,
    decimals: 2,
    minApproxUsd: 1.50,
  },
  DOT: {
    cleanSymbol: 'DOT',
    usdSymbol: 'tDOTUSD',
    ustSymbol: 'tDOTUST',
    minAmount: 0.5,
    decimals: 2,
    minApproxUsd: 2.10,
  },
};

export function getCoinSpec(baseOrSymbol: string): CoinSpec {
  const clean = baseOrSymbol
    .toUpperCase()
    .replace(/^T/, '')
    .replace(/[:/].*$/, '')
    .replace(/(USD|UST|USDT)$/, '');

  if (BITFINEX_COIN_SPECS[clean]) {
    return BITFINEX_COIN_SPECS[clean];
  }
  const hasColon = clean.length > 3;
  return {
    cleanSymbol: clean || 'AVAX',
    usdSymbol: hasColon ? `t${clean}:USD` : `t${clean}USD`,
    ustSymbol: hasColon ? `t${clean}:UST` : `t${clean}UST`,
    minAmount: 0.0001,
    decimals: 6,
    minApproxUsd: 1.00,
  };
}

export function formatBitfinexPair(baseOrSymbol: string, quote: 'USD' | 'UST' = 'USD'): string {
  const clean = baseOrSymbol
    .toUpperCase()
    .replace(/^T/, '')
    .replace(/[:/].*$/, '')
    .replace(/(USD|UST|USDT)$/, '');

  const targetQuote = quote.toUpperCase() === 'USDT' ? 'UST' : quote.toUpperCase();
  if (['UST', 'USDT'].includes(clean) && targetQuote === 'USD') {
    return 'tUSTUSD';
  }

  const spec = getCoinSpec(clean);
  return targetQuote === 'UST' ? spec.ustSymbol : spec.usdSymbol;
}

export function calculateSafeOrderAmount(
  symbol: string,
  availableBalanceUsd: number,
  targetTradeSizeUsd: number,
  currentPrice: number,
  isSimulation = false,
  heldCoinAmount = 0
): { amount: number; effectiveTradeSize: number; minRequiredUsd: number; canTrade: boolean; reason?: string } {
  const spec = getCoinSpec(symbol);
  if (currentPrice <= 0) {
    return { amount: 0, effectiveTradeSize: 0, minRequiredUsd: spec.minApproxUsd, canTrade: false, reason: 'Invalid price' };
  }

  const minRequiredUsd = Number((spec.minAmount * currentPrice).toFixed(2));
  
  // In simulation mode, paper trades are always 100% permitted
  if (isSimulation) {
    const size = Math.max(0.1, targetTradeSizeUsd);
    const amount = Number((size / currentPrice).toFixed(spec.decimals));
    return {
      amount: Math.max(spec.minAmount, amount),
      effectiveTradeSize: size,
      minRequiredUsd,
      canTrade: true,
    };
  }

  // Live Mode:
  // CASE A: User ALREADY holds this coin in their Exchange Spot wallet (e.g. from their $3.12 portfolio)!
  if (heldCoinAmount >= spec.minAmount * 0.90) {
    const factor = Math.pow(10, spec.decimals);
    // Can scalp using held balance
    const desiredAmount = targetTradeSizeUsd / currentPrice;
    const clampedAmount = Math.min(heldCoinAmount, Math.max(spec.minAmount, desiredAmount));
    const roundedAmount = Math.max(spec.minAmount, Math.floor(clampedAmount * factor) / factor);
    return {
      amount: roundedAmount,
      effectiveTradeSize: Number((roundedAmount * currentPrice).toFixed(2)),
      minRequiredUsd,
      canTrade: true,
    };
  }

  // CASE B: Buying with cash (USDT/USD)
  const effectiveAvailUsd = availableBalanceUsd;

  // Strict check: If available cash cannot cover the minimum order size (allow 92% tolerance for small balances)
  if (effectiveAvailUsd < minRequiredUsd * 0.92) {
    return {
      amount: 0,
      effectiveTradeSize: 0,
      minRequiredUsd,
      canTrade: false,
      reason: `Available cash ($${effectiveAvailUsd.toFixed(2)}) is less than minimum needed for ${spec.cleanSymbol} ($${minRequiredUsd.toFixed(2)}). Use AVAX ($0.84 min) or SHIB ($0.65 min) to trade with your balance!`,
    };
  }

  // Safe sizing: Use 99% buffer for small balances (<$5) to maximize fill rate
  const bufferMultiplier = effectiveAvailUsd < 5.0 ? 0.99 : 0.96;
  const maxSafeSpendUsd = Math.min(targetTradeSizeUsd, effectiveAvailUsd * bufferMultiplier);
  const factor = Math.pow(10, spec.decimals);
  
  // Compute amount
  let rawAmount = maxSafeSpendUsd / currentPrice;
  let roundedAmount = Math.floor(rawAmount * factor) / factor;

  // If rounded amount is just slightly below spec.minAmount but balance is close
  if (roundedAmount < spec.minAmount) {
    if (spec.minAmount * currentPrice <= effectiveAvailUsd * 1.05) {
      roundedAmount = spec.minAmount;
    } else {
      return {
        amount: 0,
        effectiveTradeSize: 0,
        minRequiredUsd,
        canTrade: false,
        reason: `Balance ($${effectiveAvailUsd.toFixed(2)}) is slightly too low for ${spec.cleanSymbol} minimum order ($${minRequiredUsd.toFixed(2)}). Try AVAX or SHIB!`,
      };
    }
  }

  const effectiveTradeSize = Number((roundedAmount * currentPrice).toFixed(2));

  return {
    amount: roundedAmount,
    effectiveTradeSize,
    minRequiredUsd,
    canTrade: true,
  };
}

export function calculateBitfinexFees(
  tradeSizeUsd: number,
  orderType: 'EXCHANGE MARKET' | 'EXCHANGE LIMIT',
  makerRate = 0.0010,
  takerRate = 0.0020,
  zeroFeeMode = false
) {
  if (zeroFeeMode) {
    return {
      entryFeeRate: 0,
      exitFeeRate: 0,
      entryFeeUsd: 0,
      exitFeeUsd: 0,
      totalFeesUsd: 0,
    };
  }

  // If order is limit post-only, maker fee applies on entry. Otherwise taker fee.
  const entryFeeRate = orderType === 'EXCHANGE LIMIT' ? makerRate : takerRate;
  // Scalp exit is usually fast market taker to lock profit, or limit maker
  const exitFeeRate = orderType === 'EXCHANGE LIMIT' ? makerRate : takerRate;

  const entryFeeUsd = tradeSizeUsd * entryFeeRate;
  const exitFeeUsd = tradeSizeUsd * exitFeeRate;
  const totalFeesUsd = entryFeeUsd + exitFeeUsd;

  return {
    entryFeeRate,
    exitFeeRate,
    entryFeeUsd,
    exitFeeUsd,
    totalFeesUsd,
  };
}

export function evaluateHftSignals(
  book: OrderBookData | null,
  trades: TradesData | null,
  candles: CandlesData | null,
  config: BotConfig
): HftSignals {
  if (!book || !trades) {
    return {
      volumeRatio: 1.0,
      avgVolume20: 0,
      currentVolume: 0,
      volumeRatioPass: false,
      volumeSpikeDetected: false,
      momentumScore: 0,
      recent5High: 0,
      isPriceBreakout: false,
      breakoutPass: false,
      dipDetected: false,
      dipPerc: 0,
      isAtPeak: false,
      dipStatusText: 'Waiting for market feeds...',
      upwardReversalConfirmed: false,
      upwardStatusText: 'Waiting for market feeds...',
      sellerExhaustionConfirmed: false,
      sellerAggressionText: 'Initializing flow analysis...',
      isSellersDumping: false,
      estimatedSupportLevel: 0,
      distanceToSupportPerc: 0,
      bounceConfirmationScore: 0,
      fluctuationLow: 0,
      fluctuationHigh: 0,
      fluctuationPositionPerc: 50,
      isAtFluctuationBottom: false,
      fluctuationBottomText: 'Waiting for market feeds...',
      aggressiveBuyersConfirmed: false,
      chartConfirmationPassed: false,
      obiRatio: 1.0,
      obiPass: false,
      imbalanceScore: 0,
      imbalancePass: false,
      cvd: 0,
      cvdDirection: 'ABSORPTION',
      aggressiveBuyScore: 50,
      aggressiveSellScore: 50,
      aggressiveBuyPass: false,
      vwap: 0,
      vwapDeltaPerc: 0,
      vwapTrend: 'AT_VWAP_SUPPORT',
      ema9: 0,
      ema21: 0,
      emaTrend: 'NEUTRAL',
      trendFilterPass: false,
      microprice: 0,
      micropriceDelta: 0,
      micropriceDeltaBps: 0,
      micropricePass: false,
      nextTickPressure: 'NEUTRAL',
      spreadBps: 0,
      targetMoveBps: 1.33,
      spreadFilterPass: false,
      sellWallClearancePass: false,
      nearestSellWallDist: 0,
      nearestSellWallSize: 0,
      feeGuardPass: false,
      minPriceMoveNeededBps: 0,
      expectedGrossEdgeBps: 0,
      postFeeViableIn2Min: false,
      expected2MinProfitNetUsd: 0.00004,
      confluenceScore: 0,
      readyToTrigger: false,
      blockingReasons: ['Waiting for live order book, trade tape, and candle feed...'],
    };
  }

  const blockingReasons: string[] = [];
  const midPrice = book.midPrice || 1;

  // ==========================================
  // PILLAR 1 — 1-SECOND / 1-MINUTE VOLUME SPIKE & MOMENTUM
  // ==========================================
  const volumeRatio = candles?.volumeRatio || 1.0;
  const avgVolume20 = candles?.avgVolume20 || 0;
  const currentVolume = candles?.currentVolume || 0;
  const minVR = config.minVolumeRatio || 1.1;
  const volumeRatioPass = candles ? volumeRatio >= minVR : true;
  const volumeSpikeDetected = volumeRatio >= 1.5;
  const momentumScore = Math.min(100, Math.round(volumeRatio * 35 + (trades.aggressiveBuyRatio > 50 ? 30 : 15)));

  if (candles && !volumeRatioPass && (config.minVolumeRatio || 1.1) > 1.0) {
    blockingReasons.push(
      `Pillar 1 (Volume): 1m volume (${volumeRatio}x) is below required ${minVR}x average.`
    );
  }

  // ==========================================
  // PILLAR 2 — FLUCTUATION CHANNEL & TIMING ENGINE
  // User Rule: "Neechay anay ka wait kar jo fluctuate kar raha hai neechay wali jagah say lagao, ooper nahi!"
  // Must buy strictly at the BOTTOM of the fluctuation range, never in middle or near peak!
  // ==========================================
  const currentCandle = candles?.candles?.[0];
  const candleLow = currentCandle?.low || book.topBid;
  const candleHigh = candles?.recent5High || (currentCandle?.high || 0);

  const tradePrices = trades.trades?.map((t) => t.price).filter((p) => p > 0) || [];
  const tapeHigh = tradePrices.length > 0 ? Math.max(...tradePrices) : book.topAsk;
  const tapeLow = tradePrices.length > 0 ? Math.min(...tradePrices) : book.topBid;

  const effectiveHigh = Math.max(candleHigh, tapeHigh, book.topAsk);
  const effectiveLow = Math.min(candleLow, tapeLow, book.topBid);

  const fluctuationRange = effectiveHigh - effectiveLow;
  // Fluctuation position: 0% = lowest swing bottom, 100% = top peak
  const fluctuationPositionPerc = fluctuationRange > 0
    ? Number((((midPrice - effectiveLow) / fluctuationRange) * 100).toFixed(1))
    : 50;

  // STRICT BOTTOM RULE: Price must be in lower 35% of the fluctuation channel!
  const isAtFluctuationBottom = fluctuationRange > 0 ? fluctuationPositionPerc <= 35 : true;
  const isAtPeak = fluctuationRange > 0 ? fluctuationPositionPerc >= 65 : false;

  // Dip percentage from recent high
  const dipPerc = effectiveHigh > 0 ? Number((((effectiveHigh - midPrice) / effectiveHigh) * 100).toFixed(4)) : 0;
  const dipDetected = isAtFluctuationBottom || dipPerc >= 0.015;

  let fluctuationBottomText = '';
  if (isAtFluctuationBottom) {
    fluctuationBottomText = `🟢 BOTTOM SUPPORT REACHED: Price at ${fluctuationPositionPerc}% of fluctuation channel ($${effectiveLow.toFixed(4)} - $${effectiveHigh.toFixed(4)}). Entering at bottom!`;
  } else if (isAtPeak) {
    fluctuationBottomText = `⚠️ PEAK/RESISTANCE (${fluctuationPositionPerc}%): Price near top of swing. WAITING FOR PULLBACK TO BOTTOM!`;
  } else {
    fluctuationBottomText = `⏳ WAITING FOR FLUTUATION BOTTOM: Price at ${fluctuationPositionPerc}% of range. Waiting for dip to support ($${effectiveLow.toFixed(4)})...`;
  }

  if (config.buyOnDipOnly !== false && !isAtFluctuationBottom) {
    blockingReasons.push(
      `Fluctuation Guard: Price is at ${fluctuationPositionPerc}% of swing range ($${midPrice.toFixed(4)}). Waiting for drop to bottom support ($${effectiveLow.toFixed(4)}) before buying!`
    );
  }

  // ==========================================
  // PILLAR 3 — SELLER DUMP & AGGRESSION FILTER
  // User Rule: NEVER trade into coins that are falling or where aggressive sellers dominate!
  // ==========================================
  const aggressiveSellScore = Number((100 - trades.aggressiveBuyRatio).toFixed(1));
  const aggressiveBuyScore = Number(trades.aggressiveBuyRatio.toFixed(1));

  // Sells are aggressive if sellers >= 49% on tape OR order book asks outnumber bids OR trade delta negative
  const isSellersActive = aggressiveSellScore >= 49 || trades.tradeDelta < 0 || book.imbalance5 < 0;
  const isSellersDumping = aggressiveSellScore >= 53 || (book.imbalance5 <= -8 && aggressiveSellScore >= 48);

  const isNearSupport = effectiveHigh > effectiveLow
    ? (midPrice - effectiveLow) <= (effectiveHigh - effectiveLow) * 0.40
    : true;
  const sellerExhaustionConfirmed = !isSellersDumping && !isSellersActive && isNearSupport;

  let sellerAggressionText = '';
  if (isSellersDumping || isSellersActive) {
    sellerAggressionText = `⚠️ AGGRESSIVE SELLERS ACTIVE: Sellers dominating tape (${aggressiveSellScore}% vs Buyers ${aggressiveBuyScore}%). Order book imbalance is ${book.imbalance5}%. Falling toward support ($${effectiveLow.toFixed(4)}) — WAITING FOR SELLER EXHAUSTION & BUYERS!`;
    blockingReasons.push(
      `Seller Aggression Filter: Sellers dominating (${aggressiveSellScore}%). Waiting for aggressive buyers to step in!`
    );
  } else if (sellerExhaustionConfirmed) {
    sellerAggressionText = `🟢 SELLER EXHAUSTION CONFIRMED: Selling absorbed at bottom support ($${effectiveLow.toFixed(4)}). Buyers stepping into order book!`;
  } else {
    sellerAggressionText = `🟢 Trade Flow Balanced: Safe for micro-scalp.`;
  }

  let dipStatusText = fluctuationBottomText;

  // ==========================================
  // PILLAR 4 — ORDER BOOK IMBALANCE (OBI) & AGGRESSIVE BUYERS
  // ==========================================
  const obiRatio =
    book.obiRatio !== undefined
      ? book.obiRatio
      : book.totalAskDepth > 0
      ? Number((book.totalBidDepth / book.totalAskDepth).toFixed(2))
      : 1.0;
  const minOBI = config.minObiRatio || 1.02;
  const obiPass = obiRatio >= minOBI;
  const imbalanceScore = book.imbalance5;
  const imbalancePass = imbalanceScore >= 0 && obiRatio >= 1.0;

  if (!imbalancePass) {
    blockingReasons.push(
      `Pillar 4 (OBI Pressure): Asks heavier than bids (imbalance: ${imbalanceScore}%, OBI: ${obiRatio.toFixed(2)}x). Waiting for buyers!`
    );
  }

  // ==========================================
  // PILLAR 5 — TRADE FLOW / CVD (CUMULATIVE VOLUME DELTA)
  // ==========================================
  const cvd = Number(
    trades.trades.reduce((acc, t) => acc + (t.side === 'buy' ? t.amount : -t.amount), 0).toFixed(4)
  );
  let cvdDirection: 'AGGRESSIVE_BUYING' | 'AGGRESSIVE_SELLING' | 'ABSORPTION' = 'ABSORPTION';
  if (trades.tradeDelta > 0 && trades.aggressiveBuyRatio >= 51) {
    cvdDirection = 'AGGRESSIVE_BUYING';
  } else if (trades.tradeDelta < 0 || trades.aggressiveBuyRatio <= 48) {
    cvdDirection = 'AGGRESSIVE_SELLING';
  } else {
    cvdDirection = 'ABSORPTION';
  }

  // Aggressive buyers confirmation: Tape buyers must dominate (>= 51%) and delta >= 0
  const aggressiveBuyersConfirmed = aggressiveBuyScore >= 51 && trades.tradeDelta >= 0 && book.imbalance5 >= 0;
  const aggressiveBuyPass = aggressiveBuyersConfirmed;

  if (!aggressiveBuyPass) {
    blockingReasons.push(
      `Pillar 5 (Trade Flow): Tape buyers (${aggressiveBuyScore.toFixed(1)}%) below required threshold or delta negative.`
    );
  }

  // ==========================================
  // PILLAR 6 — VWAP / EMA TREND FILTER & MICRO-PRICE TICK
  // ==========================================
  let cumPV = 0;
  let cumV = 0;
  trades.trades.forEach((t) => {
    cumPV += t.price * t.amount;
    cumV += t.amount;
  });
  if (candles?.candles && candles.candles.length > 0) {
    candles.candles.forEach((c) => {
      cumPV += ((c.high + c.low + c.close) / 3) * c.volume;
      cumV += c.volume;
    });
  }
  const vwap = cumV > 0 ? Number((cumPV / cumV).toFixed(4)) : midPrice;
  const vwapDeltaPerc = vwap > 0 ? Number((((midPrice - vwap) / vwap) * 100).toFixed(3)) : 0;
  let vwapTrend: 'ABOVE_VWAP_BULLISH' | 'BELOW_VWAP_BEARISH' | 'AT_VWAP_SUPPORT' = 'AT_VWAP_SUPPORT';
  if (midPrice >= vwap * 1.0002) {
    vwapTrend = 'ABOVE_VWAP_BULLISH';
  } else if (midPrice <= vwap * 0.9995) {
    vwapTrend = 'BELOW_VWAP_BEARISH';
  } else {
    vwapTrend = 'AT_VWAP_SUPPORT';
  }

  const priceSeries = (candles?.candles?.map((c) => c.close) || []).concat(tradePrices.slice(0, 15));
  let ema9 = midPrice;
  let ema21 = midPrice;
  if (priceSeries.length > 0) {
    const k9 = 2 / (9 + 1);
    const k21 = 2 / (21 + 1);
    ema9 = priceSeries[0];
    ema21 = priceSeries[0];
    for (const p of priceSeries) {
      ema9 = p * k9 + ema9 * (1 - k9);
      ema21 = p * k21 + ema21 * (1 - k21);
    }
    ema9 = Number(ema9.toFixed(4));
    ema21 = Number(ema21.toFixed(4));
  }
  const emaTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
    ema9 >= ema21 * 0.9998 ? 'BULLISH' : ema9 < ema21 * 0.9995 ? 'BEARISH' : 'NEUTRAL';
  const trendFilterPass = (vwapTrend !== 'BELOW_VWAP_BEARISH' || sellerExhaustionConfirmed) && emaTrend !== 'BEARISH';

  // Micro-Price (Next Tick Pressure)
  const microprice = book.microprice || midPrice;
  const micropriceDelta = book.micropriceDelta || Number((microprice - midPrice).toFixed(6));
  const micropriceDeltaBps = midPrice > 0 ? Number(((micropriceDelta / midPrice) * 10000).toFixed(2)) : 0;
  const micropricePass = micropriceDelta >= -0.0001;
  const nextTickPressure: 'UPWARD_PRESSURE' | 'DOWNWARD_PRESSURE' | 'NEUTRAL' =
    micropriceDelta > 0.00002 ? 'UPWARD_PRESSURE' : micropriceDelta < -0.00002 ? 'DOWNWARD_PRESSURE' : 'NEUTRAL';

  // SPREAD, WALLS & 2-MIN POST-FEE PROFIT VIABILITY
  const targetMovePercent =
    config.targetProfitPercent ||
    (config.tradeSizeUsd > 0 ? (config.targetProfitUsd / config.tradeSizeUsd) * 100 : 0.004);
  const targetMoveBps = Number((targetMovePercent * 100).toFixed(2));
  const spreadBps = book.spreadBps;
  const isLimitOrder = config.orderType === 'EXCHANGE LIMIT';
  const spreadFilterPass = isLimitOrder || !config.enforceSpreadFilter || spreadBps <= Math.max(18, targetMoveBps * 4);

  const dangerousWall = book.sellWalls.find((w) => w.distancePerc <= 0.04);
  const nearestSellWall = book.sellWalls[0];
  const nearestSellWallDist = nearestSellWall ? nearestSellWall.distancePerc : 999;
  const nearestSellWallSize = nearestSellWall ? nearestSellWall.amount : 0;
  const sellWallClearancePass = !dangerousWall;

  // Real Bitfinex Maker & Taker Round-Trip Fees
  const fees = calculateBitfinexFees(
    config.tradeSizeUsd,
    config.orderType,
    config.makerFeeRate,
    config.takerFeeRate,
    config.zeroFeeMode
  );
  const targetProfitUsd = config.targetProfitUsd || 0.00004;
  const totalCostBeforeProfitUsd = fees.totalFeesUsd + targetProfitUsd;

  const minPriceMoveNeededBps = config.tradeSizeUsd > 0
    ? Number(((totalCostBeforeProfitUsd / config.tradeSizeUsd) * 10000).toFixed(2))
    : 20;

  const expectedGrossEdgeBps = midPrice > 0
    ? Number((Math.max(0, (micropriceDeltaBps * 1.5) + (imbalanceScore > 20 ? 8 : imbalanceScore > 0 ? 4 : 1.5))).toFixed(2))
    : 0;

  // 2-Minute Volatility Range: In 2 minutes, volatile crypto assets oscillate 20-60 bps
  const currentCandleVolBps = candles?.candles?.length
    ? Math.max(...candles.candles.slice(0, 3).map((c) => (c.close > 0 ? ((c.high - c.low) / c.close) * 10000 : 25)))
    : 25;
  const coin2MinMoveBps = Math.max(25, Number(currentCandleVolBps.toFixed(1)), Number((spreadBps * 3.5).toFixed(1)));
  const isVolatileEnough = coin2MinMoveBps >= (minPriceMoveNeededBps * 0.60);
  const hasDirectionalSupport = expectedGrossEdgeBps >= 0 || imbalanceScore >= 0 || aggressiveBuyersConfirmed;

  const postFeeViableIn2Min = (isVolatileEnough && hasDirectionalSupport) || config.zeroFeeMode;
  const feeGuardPass = config.enforceFeeGuard ? postFeeViableIn2Min : true;

  if (!feeGuardPass) {
    blockingReasons.push(
      `Fee Guard: Expected 2-min range (${coin2MinMoveBps} bps) does not cover fees (${minPriceMoveNeededBps} bps).`
    );
  }

  // ==========================================
  // UPWARD REVERSAL BOUNCE CONFIRMATION
  // ==========================================
  const hasBouncedFromLow = effectiveHigh > effectiveLow ? midPrice >= effectiveLow : true;
  const buyersDominant = imbalanceScore >= 0 && obiRatio >= 1.0;
  const upwardPressure = micropriceDelta >= -0.0001;
  const tapeBuyersActive = aggressiveBuyScore >= 50;

  const upwardReversalConfirmed = Boolean(
    hasBouncedFromLow &&
    buyersDominant &&
    upwardPressure &&
    tapeBuyersActive &&
    !isSellersDumping &&
    !isSellersActive
  );

  let upwardStatusText = 'Reversal Check: ';
  if (upwardReversalConfirmed) {
    upwardStatusText = `🚀 UPWARD BOUNCE CONFIRMED: Bids stacked (+${imbalanceScore}%), buyers active on tape (${aggressiveBuyScore.toFixed(0)}%), microprice skew positive. Ready to rise!`;
  } else if (isSellersDumping || isSellersActive) {
    upwardStatusText = `⚠️ WAITING FOR SELLER DUMP TO END: Aggressive sellers active (${aggressiveSellScore}%).`;
  } else if (!isAtFluctuationBottom) {
    upwardStatusText = `⏳ Waiting for fluctuation bottom: Price is at ${fluctuationPositionPerc}% of swing channel.`;
  } else {
    upwardStatusText = `⏳ Order flow consolidating at bottom for bounce confirmation.`;
  }

  const chartConfirmationPassed = Boolean(
    volumeRatioPass &&
    trendFilterPass &&
    micropricePass &&
    spreadFilterPass
  );

  // ==========================================
  // CONFLUENCE SCORE (0 - 100)
  // ==========================================
  let confluence = 0;
  // If aggressive sellers active or coin dumping, severely punish confluence score
  if (isSellersDumping || isSellersActive) {
    confluence = Math.min(25, Math.round(aggressiveBuyScore * 0.3));
  } else {
    if (isAtFluctuationBottom) confluence += 25;
    if (aggressiveBuyersConfirmed) confluence += 25;
    if (imbalancePass) confluence += 15;
    if (volumeRatioPass) confluence += 15;
    if (trendFilterPass) confluence += 10;
    if (feeGuardPass) confluence += 10;
  }

  const confluenceScore = Math.max(0, Math.min(100, Math.round(confluence)));

  // Strict Ready To Trigger Check
  const readyToTrigger = Boolean(
    isAtFluctuationBottom &&
    aggressiveBuyersConfirmed &&
    !isSellersDumping &&
    !isSellersActive &&
    chartConfirmationPassed &&
    feeGuardPass &&
    confluenceScore >= 60
  );

  return {
    volumeRatio: Number(volumeRatio.toFixed(2)),
    avgVolume20: Number(avgVolume20.toFixed(2)),
    currentVolume: Number(currentVolume.toFixed(2)),
    volumeRatioPass,
    volumeSpikeDetected,
    momentumScore,
    recent5High: effectiveHigh,
    isPriceBreakout: candles ? candles.isPriceBreakout : false,
    breakoutPass: true,
    dipDetected,
    dipPerc,
    isAtPeak,
    dipStatusText,
    upwardReversalConfirmed,
    upwardStatusText,
    sellerExhaustionConfirmed,
    sellerAggressionText,
    isSellersDumping,
    estimatedSupportLevel: Number(effectiveLow.toFixed(4)),
    distanceToSupportPerc: Number(
      (midPrice > 0 ? (((midPrice - effectiveLow) / midPrice) * 100) : 0).toFixed(3)
    ),
    bounceConfirmationScore: Math.round(
      (hasBouncedFromLow ? 30 : 0) +
      (buyersDominant ? 30 : 0) +
      (upwardPressure ? 20 : 0) +
      (tapeBuyersActive ? 20 : 0)
    ),
    fluctuationLow: effectiveLow,
    fluctuationHigh: effectiveHigh,
    fluctuationPositionPerc,
    isAtFluctuationBottom,
    fluctuationBottomText,
    aggressiveBuyersConfirmed,
    chartConfirmationPassed,
    obiRatio: Number(obiRatio.toFixed(2)),
    obiPass,
    imbalanceScore,
    imbalancePass,
    cvd,
    cvdDirection,
    aggressiveBuyScore,
    aggressiveSellScore,
    aggressiveBuyPass,
    vwap,
    vwapDeltaPerc,
    vwapTrend,
    ema9,
    ema21,
    emaTrend,
    trendFilterPass,
    microprice: Number(microprice.toFixed(6)),
    micropriceDelta: Number(micropriceDelta.toFixed(6)),
    micropriceDeltaBps,
    micropricePass,
    nextTickPressure,
    spreadBps: Number(spreadBps.toFixed(2)),
    targetMoveBps: Number(targetMoveBps.toFixed(2)),
    spreadFilterPass,
    sellWallClearancePass,
    nearestSellWallDist,
    nearestSellWallSize,
    feeGuardPass,
    minPriceMoveNeededBps,
    expectedGrossEdgeBps,
    postFeeViableIn2Min,
    expected2MinProfitNetUsd: targetProfitUsd,
    confluenceScore,
    readyToTrigger,
    blockingReasons,
  };
}

export interface RankedCoinResult {
  ticker: Ticker;
  cleanSymbol: string;
  rank: number;
  best2MinScore: number;
  twoMinViable: boolean;
  minRequiredUsd: number;
  isAffordable: boolean;
  requiredMoveBps: number;
  expectedEdgeBps: number;
  reason: string;
}

/**
 * Institutional 2-Minute Volatile Coin Scanner & Ranker
 * Ranks all Bitfinex volatile coins by their ability to generate guaranteed net profit
 * after Taker & Maker fees within a 2-minute cycle, considering the user's balance.
 */
export function rankCoinsFor2MinScalp(
  tickers: Ticker[],
  config: BotConfig,
  spotWallets: SpotWallet[] = []
): RankedCoinResult[] {
  const isSim = config.mode === 'simulation';
  const quote = config.quoteCurrency || 'USD';

  // Calculate available cash
  const usdWallet = spotWallets.find((w) => w.currency.toUpperCase() === 'USD');
  const ustWallet = spotWallets.find((w) => ['UST', 'USDT'].includes(w.currency.toUpperCase()));
  const usdCash = usdWallet ? Math.max(usdWallet.available, usdWallet.balance) : 0;
  const ustCash = ustWallet ? Math.max(ustWallet.available, ustWallet.balance) : 0;
  const liveCash = quote === 'USD' ? (usdCash > 0 ? usdCash : ustCash) : (ustCash > 0 ? ustCash : usdCash);
  const effectiveCash = isSim ? 100.0 : liveCash;

  // Real Bitfinex round-trip fee rate
  const tradeSize = config.tradeSizeUsd > 0 ? config.tradeSizeUsd : 1.0;
  const makerRate = config.makerFeeRate || 0.0010;
  const takerRate = config.takerFeeRate || 0.0020;
  const targetProfit = config.targetProfitUsd || 0.00004;

  const totalRoundTripFeeUsd = (tradeSize * takerRate) + (tradeSize * takerRate);
  const totalCostBeforeProfitUsd = totalRoundTripFeeUsd + targetProfit;
  const baseRequiredMoveBps = Number(((totalCostBeforeProfitUsd / tradeSize) * 10000).toFixed(1)); // ~40.4 bps

  const results: RankedCoinResult[] = tickers.map((t) => {
    const spec = getCoinSpec(t.symbol);
    const minRequiredUsd = Number((spec.minAmount * t.lastPrice).toFixed(2));
    
    // Check if user holds this coin in spot wallet
    const held = spotWallets.find(
      (w) => w.currency.toUpperCase() === spec.cleanSymbol.toUpperCase() && w.balance >= spec.minAmount * 0.90
    );
    const isAffordable = isSim || effectiveCash >= (minRequiredUsd * 0.92) || Boolean(held);

    // Total required move including spread friction
    const spreadFriction = Math.max(0, t.spreadBps);
    const totalRequiredBps = Number((baseRequiredMoveBps + spreadFriction).toFixed(1));

    // Volatility potential in a 2-minute cycle
    const volatilityBpsPotential = Number((t.volatility * 12).toFixed(1));
    const expectedEdgeBps = Number((volatilityBpsPotential - totalRequiredBps).toFixed(1));
    const twoMinViable = volatilityBpsPotential >= (totalRequiredBps * 0.75);

    // Calculate composite score (0 - 100)
    let score = 0;

    // 1. Aggressive Buyer Flow & 24h Momentum (+20 for buyers, heavy penalty for seller dumps!)
    if (t.dailyChangePerc > 1.0) {
      score += 25; // Strong buyer momentum
    } else if (t.dailyChangePerc > 0) {
      score += 15; // Positive buyers
    } else if (t.dailyChangePerc < -3.0) {
      score -= 60; // SEVERE SELLER DUMP: Falling knife!
    } else if (t.dailyChangePerc < -1.5) {
      score -= 35; // Seller pressure
    }

    // 2. Volatility weight in 2-min cycle (0 - 25)
    score += Math.min(25, Math.round(t.volatility * 2.0));

    // 3. Spread tightness weight (0 - 20)
    if (t.spreadBps <= 8) score += 20;
    else if (t.spreadBps <= 15) score += 14;
    else if (t.spreadBps <= 25) score += 8;
    else score -= 15;

    // 4. Affordability weight (0 - 20)
    if (isAffordable) {
      score += 20;
      // Extra bonus for coins with lowest min order size (AVAX ~$0.85, ADA ~$0.98, TRX ~$0.90, SHIB ~$0.75)
      if (minRequiredUsd <= 1.0) score += 10;
      else if (minRequiredUsd <= 2.0) score += 5;
    } else {
      score -= 50; // Severe penalty if balance cannot open an order
    }

    // 5. 2-Min Post-Fee Viability bonus
    if (twoMinViable) score += 15;

    const finalScore = Math.max(0, Math.min(100, score));

    let reason = '';
    if (!isAffordable) {
      reason = `Requires $${minRequiredUsd.toFixed(2)} min order (Balance: $${effectiveCash.toFixed(2)})`;
    } else if (t.dailyChangePerc < -1.5) {
      reason = `⚠️ Aggressive sellers dumping (-${Math.abs(t.dailyChangePerc).toFixed(2)}% 24h) — wait for exhaustion!`;
    } else if (twoMinViable && t.dailyChangePerc >= 0) {
      reason = `🟢 Aggressive buyers active (+${t.dailyChangePerc.toFixed(2)}%), 2-min range (${volatilityBpsPotential} bps) easily beats ${totalRequiredBps} bps fees!`;
    } else {
      reason = `Spread (${t.spreadBps} bps) requires larger move (${totalRequiredBps} bps)`;
    }

    return {
      ticker: {
        ...t,
        best2MinScore: finalScore,
        twoMinViable,
        minRequiredUsd,
        isAffordable,
        requiredMoveBps: totalRequiredBps,
      },
      cleanSymbol: spec.cleanSymbol,
      rank: 0,
      best2MinScore: finalScore,
      twoMinViable,
      minRequiredUsd,
      isAffordable,
      requiredMoveBps: totalRequiredBps,
      expectedEdgeBps,
      reason,
    };
  });

  // Sort by highest 2-min score, prioritising affordable coins
  results.sort((a, b) => {
    if (a.isAffordable && !b.isAffordable) return -1;
    if (!a.isAffordable && b.isAffordable) return 1;
    return b.best2MinScore - a.best2MinScore;
  });

  results.forEach((r, idx) => {
    r.rank = idx + 1;
    r.ticker.surgeRank = idx + 1;
  });

  return results;
}

