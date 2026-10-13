import { OrderBookData, Ticker, TradesData, SpotWallet, CandlesData } from '../types/trading';

let localTickersCache: Ticker[] = [];
const localBookCache: Record<string, OrderBookData> = {};
const localTradesCache: Record<string, TradesData> = {};
const localCandlesCache: Record<string, CandlesData> = {};

const FALLBACK_TICKERS: Ticker[] = [
  { symbol: 'tBTCUST', cleanSymbol: 'BTC/UST', bid: 67250, bidSize: 2.1, ask: 67252, askSize: 1.8, dailyChange: 840, dailyChangePerc: 1.26, lastPrice: 67251.0, volume: 1420.5, high: 67800, low: 65900, spread: 2, spreadBps: 0.30, volatility: 2.88 },
  { symbol: 'tETHUST', cleanSymbol: 'ETH/UST', bid: 3485, bidSize: 15.0, ask: 3485.5, askSize: 12.5, dailyChange: 45, dailyChangePerc: 1.31, lastPrice: 3485.2, volume: 8400.2, high: 3520, low: 3410, spread: 0.5, spreadBps: 1.43, volatility: 3.22 },
  { symbol: 'tSOLUST', cleanSymbol: 'SOL/UST', bid: 154.2, bidSize: 55.0, ask: 154.3, askSize: 42.0, dailyChange: 5.2, dailyChangePerc: 3.49, lastPrice: 154.25, volume: 32500, high: 158.5, low: 148.0, spread: 0.1, spreadBps: 6.48, volatility: 7.09 },
  { symbol: 'tXRPUST', cleanSymbol: 'XRP/UST', bid: 0.542, bidSize: 25000, ask: 0.5422, askSize: 18000, dailyChange: 0.012, dailyChangePerc: 2.26, lastPrice: 0.5421, volume: 185000, high: 0.555, low: 0.528, spread: 0.0002, spreadBps: 3.69, volatility: 5.11 },
  { symbol: 'tDOGE:UST', cleanSymbol: 'DOGE/UST', bid: 0.118, bidSize: 35000, ask: 0.1181, askSize: 42000, dailyChange: 0.003, dailyChangePerc: 2.61, lastPrice: 0.11805, volume: 120000, high: 0.122, low: 0.114, spread: 0.0001, spreadBps: 8.47, volatility: 7.01 },
  { symbol: 'tAVAX:UST', cleanSymbol: 'AVAX/UST', bid: 28.4, bidSize: 120, ask: 28.45, askSize: 150, dailyChange: 0.9, dailyChangePerc: 3.27, lastPrice: 28.42, volume: 9500, high: 29.2, low: 27.1, spread: 0.05, spreadBps: 17.59, volatility: 7.75 },
  { symbol: 'tLINK:UST', cleanSymbol: 'LINK/UST', bid: 11.85, bidSize: 220, ask: 11.88, askSize: 190, dailyChange: 0.35, dailyChangePerc: 3.04, lastPrice: 11.86, volume: 6400, high: 12.15, low: 11.45, spread: 0.03, spreadBps: 25.3, volatility: 6.11 },
  { symbol: 'tADAUST', cleanSymbol: 'ADA/UST', bid: 0.352, bidSize: 14000, ask: 0.3522, askSize: 16000, dailyChange: 0.008, dailyChangePerc: 2.32, lastPrice: 0.3521, volume: 95000, high: 0.362, low: 0.342, spread: 0.0002, spreadBps: 5.68, volatility: 5.85 },
  { symbol: 'tSHIB:UST', cleanSymbol: 'SHIB/UST', bid: 0.0000185, bidSize: 50000000, ask: 0.00001852, askSize: 45000000, dailyChange: 0.0000004, dailyChangePerc: 2.21, lastPrice: 0.00001851, volume: 850000000, high: 0.0000192, low: 0.0000178, spread: 0.00000002, spreadBps: 10.8, volatility: 7.86 },
  { symbol: 'tBTCUSD', cleanSymbol: 'BTC/USD', bid: 67250, bidSize: 2.1, ask: 67252, askSize: 1.8, dailyChange: 840, dailyChangePerc: 1.26, lastPrice: 67251.0, volume: 1420.5, high: 67800, low: 65900, spread: 2, spreadBps: 0.30, volatility: 2.88 },
  { symbol: 'tETHUSD', cleanSymbol: 'ETH/USD', bid: 3485, bidSize: 15.0, ask: 3485.5, askSize: 12.5, dailyChange: 45, dailyChangePerc: 1.31, lastPrice: 3485.2, volume: 8400.2, high: 3520, low: 3410, spread: 0.5, spreadBps: 1.43, volatility: 3.22 },
  { symbol: 'tSOLUSD', cleanSymbol: 'SOL/USD', bid: 154.2, bidSize: 55.0, ask: 154.3, askSize: 42.0, dailyChange: 5.2, dailyChangePerc: 3.49, lastPrice: 154.25, volume: 32500, high: 158.5, low: 148.0, spread: 0.1, spreadBps: 6.48, volatility: 7.09 },
  { symbol: 'tXRPUSD', cleanSymbol: 'XRP/USD', bid: 0.542, bidSize: 25000, ask: 0.5422, askSize: 18000, dailyChange: 0.012, dailyChangePerc: 2.26, lastPrice: 0.5421, volume: 185000, high: 0.555, low: 0.528, spread: 0.0002, spreadBps: 3.69, volatility: 5.11 },
];

function filterFallbackTickers(symbols?: string): Ticker[] {
  if (!symbols) return FALLBACK_TICKERS.slice(0, 7);
  const requested = symbols.split(',').map((s) => s.trim().toUpperCase());
  const matched = FALLBACK_TICKERS.filter((t) => requested.includes(t.symbol.toUpperCase()));
  return matched.length > 0 ? matched : FALLBACK_TICKERS.slice(0, 7);
}

export const api = {
  async getServerIp(): Promise<{ ip: string }> {
    try {
      const res = await fetch('/api/server-ip');
      if (!res.ok) throw new Error('Failed to fetch server IP');
      return await res.json();
    } catch {
      return { ip: '34.96.39.52' };
    }
  },

  async pingBitfinex(): Promise<{ online: boolean; latencyMs: number }> {
    try {
      const res = await fetch('/api/bitfinex/ping');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return { online: false, latencyMs: 999 };
    }
  },

  async getTickers(symbols?: string): Promise<Ticker[]> {
    try {
      const url = symbols ? `/api/bitfinex/tickers?symbols=${encodeURIComponent(symbols)}` : '/api/bitfinex/tickers';
      const res = await fetch(url);
      if (!res.ok) {
        if (localTickersCache.length > 0) return localTickersCache;
        return filterFallbackTickers(symbols);
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        localTickersCache = data;
        return data;
      }
      if (localTickersCache.length > 0) return localTickersCache;
      return filterFallbackTickers(symbols);
    } catch {
      if (localTickersCache.length > 0) return localTickersCache;
      return filterFallbackTickers(symbols);
    }
  },

  async getOrderBook(symbol: string, precision = 'P0', len = '25'): Promise<OrderBookData> {
    const cacheKey = `${symbol}:${precision}:${len}`;
    try {
      const res = await fetch(`/api/bitfinex/book?symbol=${encodeURIComponent(symbol)}&precision=${precision}&len=${len}`);
      if (!res.ok) {
        if (localBookCache[cacheKey]) return localBookCache[cacheKey];
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to fetch order book (HTTP ${res.status})`);
      }
      const data = await res.json();
      localBookCache[cacheKey] = data;
      return data;
    } catch (err: any) {
      if (localBookCache[cacheKey]) return localBookCache[cacheKey];
      throw new Error(`Failed to fetch order book: ${err.message || 'Network error'}`);
    }
  },

  async getTrades(symbol: string, limit = '50'): Promise<TradesData> {
    try {
      const res = await fetch(`/api/bitfinex/trades?symbol=${encodeURIComponent(symbol)}&limit=${limit}`);
      if (!res.ok) {
        if (localTradesCache[symbol]) return localTradesCache[symbol];
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to fetch trades (HTTP ${res.status})`);
      }
      const data = await res.json();
      localTradesCache[symbol] = data;
      return data;
    } catch (err: any) {
      if (localTradesCache[symbol]) return localTradesCache[symbol];
      throw new Error(`Failed to fetch trades: ${err.message || 'Network error'}`);
    }
  },

  async getCandles(symbol: string, timeframe = '1m'): Promise<CandlesData> {
    const cacheKey = `${symbol}:${timeframe}`;
    try {
      const res = await fetch(`/api/bitfinex/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`);
      if (!res.ok) {
        if (localCandlesCache[cacheKey]) return localCandlesCache[cacheKey];
        throw new Error(`Failed to fetch candles: ${res.statusText}`);
      }
      const data = await res.json();
      localCandlesCache[cacheKey] = data;
      return data;
    } catch (err: any) {
      if (localCandlesCache[cacheKey]) return localCandlesCache[cacheKey];
      throw new Error(`Failed to fetch candles: ${err.message || 'Network error'}`);
    }
  },

  async validateApiCredentials(
    apiKey: string,
    apiSecret: string
  ): Promise<{
    success: boolean;
    error?: string;
    exchangeWallets?: SpotWallet[];
    fundingWallets?: SpotWallet[];
    marginWallets?: SpotWallet[];
    totalUsdtAvailable?: number;
  }> {
    const res = await fetch('/api/bitfinex/auth/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, apiSecret }),
    });
    return await res.json();
  },

  async transferWalletFunds(payload: {
    apiKey: string;
    apiSecret: string;
    from: 'funding' | 'margin';
    to: 'exchange';
    currency: string;
    amount: number;
  }): Promise<{ success: boolean; error?: string; result?: any }> {
    const res = await fetch('/api/bitfinex/auth/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async autoPrepareUsdt(
    apiKey: string,
    apiSecret: string
  ): Promise<{
    success: boolean;
    error?: string;
    transferredAmount?: number;
    actionsTaken?: string[];
    spotWallets?: SpotWallet[];
    fundingWallets?: SpotWallet[];
    exchangeUsdt?: number;
    exchangeUsd?: number;
    readyToTrade?: boolean;
    activeQuote?: 'USD' | 'UST';
  }> {
    const res = await fetch('/api/bitfinex/auth/auto-prepare-usdt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, apiSecret }),
    });
    return await res.json();
  },

  async convertCryptoHoldingsToCash(payload: {
    apiKey: string;
    apiSecret: string;
    targetQuote?: 'UST' | 'USD';
  }): Promise<{
    success: boolean;
    error?: string;
    message?: string;
    actionsTaken?: string[];
    convertedList?: Array<{
      currency: string;
      amountSold: number;
      pair: string;
      orderId?: any;
      success: boolean;
      error?: string;
    }>;
    convertedCount?: number;
    spotWallets?: SpotWallet[];
    finalUsd?: number;
    finalUst?: number;
    totalCash?: number;
    activeQuote?: 'UST' | 'USD';
  }> {
    const res = await fetch('/api/bitfinex/auth/convert-holdings-to-cash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async getSpotWallets(apiKey: string, apiSecret: string): Promise<{
    success: boolean;
    spotWallets: SpotWallet[];
    fundingWallets?: SpotWallet[];
    marginWallets?: SpotWallet[];
    allWallets?: SpotWallet[];
    totalAccountNetWorthUsd?: number;
    totalLiquidCash?: number;
    totalExchangeCash?: number;
    exchangeUsd?: number;
    exchangeUst?: number;
    totalFundingCash?: number;
    totalMarginCash?: number;
    totalCryptoHoldingsUsd?: number;
  }> {
    const res = await fetch('/api/bitfinex/auth/wallets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, apiSecret }),
    });
    return await res.json();
  },

  async submitOrder(payload: {
    apiKey: string;
    apiSecret: string;
    symbol: string;
    type: 'EXCHANGE MARKET' | 'EXCHANGE LIMIT';
    amount: number;
    price?: number;
  }): Promise<{
    success: boolean;
    result?: any;
    execPrice?: number;
    orderId?: number;
    symbolUsed?: string;
    error?: string;
  }> {
    const res = await fetch('/api/bitfinex/auth/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async cancelOrder(payload: { apiKey: string; apiSecret: string; id: number }) {
    const res = await fetch('/api/bitfinex/auth/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async cancelAllOrders(apiKey: string, apiSecret: string): Promise<{ success: boolean; error?: string; message?: string }> {
    const res = await fetch('/api/bitfinex/auth/cancel-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, apiSecret }),
    });
    return await res.json();
  },

  async getActiveOrders(apiKey: string, apiSecret: string, symbol?: string): Promise<{
    success: boolean;
    count?: number;
    activeOrders?: Array<{
      id: number;
      symbol: string;
      amount: number;
      amountOrig: number;
      type: string;
      status: string;
      price: number;
    }>;
    error?: string;
  }> {
    const res = await fetch('/api/bitfinex/auth/active-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, apiSecret, symbol }),
    });
    return await res.json();
  },

  async getAccountFeeRates(apiKey: string, apiSecret: string): Promise<{
    success: boolean;
    isZeroFeeConfirmed?: boolean;
    makerFeePercent?: number;
    takerFeePercent?: number;
    tradesAudited?: number;
    actualChargedTradesCount?: number;
    totalFeeCharged?: number;
    feeVerdictUrdu?: string;
    error?: string;
  }> {
    const res = await fetch('/api/bitfinex/auth/fee-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, apiSecret }),
    });
    return await res.json();
  },

  async getAccountTradesHistory(
    apiKey: string,
    apiSecret: string,
    limit = 50
  ): Promise<{
    success: boolean;
    error?: string;
    tradesCount?: number;
    trades?: Array<{
      id: number;
      symbol: string;
      cleanSymbol: string;
      timestamp: number;
      time: string;
      date: string;
      orderId: number;
      amount: number;
      side: 'BUY' | 'SELL';
      price: number;
      usdValue: number;
      orderType: string;
      isMaker: boolean;
      fee: number;
      feeCurrency: string;
    }>;
    audit?: {
      totalTrades: number;
      buyCount: number;
      sellCount: number;
      totalVolumeUsd: number;
      totalFeeChargedByBitfinex: number;
      isBitfinexFeeZero: boolean;
      averageFeeRatePerc?: number;
      estimatedSpreadLossUsd: number;
      primaryCauseOfLoss: string;
      diagnosisUrdu: string;
    };
  }> {
    const res = await fetch('/api/bitfinex/auth/trades-hist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, apiSecret, limit }),
    });
    return await res.json();
  },

  async getAccountOrdersHistory(
    apiKey: string,
    apiSecret: string,
    limit = 50
  ): Promise<{
    success: boolean;
    error?: string;
    ordersCount?: number;
    orders?: Array<{
      id: number;
      symbol: string;
      cleanSymbol: string;
      createTime: number;
      updateTime: number;
      time: string;
      amount: number;
      side: 'BUY' | 'SELL';
      type: string;
      status: string;
      price: number;
      priceAvg: number;
    }>;
  }> {
    const res = await fetch('/api/bitfinex/auth/orders-hist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, apiSecret, limit }),
    });
    return await res.json();
  },

  async analyzeMicrostructureWithAi(payload: {
    symbol: string;
    midPrice: number;
    micropriceDelta: number;
    imbalance5: number;
    aggressiveBuyRatio: number;
    spreadBps: number;
    sellWallsCount: number;
    buyWallsCount: number;
  }): Promise<{ analysis: string; timestamp: number }> {
    const res = await fetch('/api/ai/microstructure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },
};
