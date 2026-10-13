import { OrderBookData, Ticker, TradesData, SpotWallet, CandlesData } from '../types/trading';

export const api = {
  async getServerIp(): Promise<{ ip: string }> {
    try {
      const res = await fetch('/api/server-ip');
      if (!res.ok) throw new Error('Failed to fetch server IP');
      return await res.json();
    } catch (err: any) {
      return { ip: '34.96.39.52' };
    }
  },

  async pingBitfinex(): Promise<{ online: boolean; latencyMs: number }> {
    try {
      const res = await fetch('/api/bitfinex/ping');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      return { online: false, latencyMs: 999 };
    }
  },

  async getTickers(symbols?: string): Promise<Ticker[]> {
    const url = symbols ? `/api/bitfinex/tickers?symbols=${encodeURIComponent(symbols)}` : '/api/bitfinex/tickers';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load tickers: ${res.statusText}`);
    return await res.json();
  },

  async getOrderBook(symbol: string, precision = 'P0', len = '25'): Promise<OrderBookData> {
    try {
      const res = await fetch(`/api/bitfinex/book?symbol=${encodeURIComponent(symbol)}&precision=${precision}&len=${len}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to fetch order book (HTTP ${res.status})`);
      }
      return await res.json();
    } catch (err: any) {
      throw new Error(`Failed to fetch order book: ${err.message || 'Network error'}`);
    }
  },

  async getTrades(symbol: string, limit = '50'): Promise<TradesData> {
    try {
      const res = await fetch(`/api/bitfinex/trades?symbol=${encodeURIComponent(symbol)}&limit=${limit}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to fetch trades (HTTP ${res.status})`);
      }
      return await res.json();
    } catch (err: any) {
      throw new Error(`Failed to fetch trades: ${err.message || 'Network error'}`);
    }
  },

  async getCandles(symbol: string, timeframe = '1m'): Promise<CandlesData> {
    try {
      const res = await fetch(`/api/bitfinex/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`);
      if (!res.ok) throw new Error(`Failed to fetch candles: ${res.statusText}`);
      return await res.json();
    } catch (err: any) {
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
