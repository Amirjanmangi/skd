import React from 'react';
import { OrderBookData } from '../types/trading';
import { Layers, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';

interface OrderBookLadderProps {
  book: OrderBookData | null;
  isLoading: boolean;
}

export const OrderBookLadder: React.FC<OrderBookLadderProps> = ({ book, isLoading }) => {
  if (isLoading && !book) {
    return (
      <div className="bg-[#0f1420] border border-slate-800 rounded-xl p-4 shadow-lg min-h-[380px] flex items-center justify-center">
        <div className="text-xs text-slate-500 font-mono">Streaming live Bitfinex order book...</div>
      </div>
    );
  }

  if (!book) return null;

  const maxBidTotal = book.bids.length > 0 ? book.bids[book.bids.length - 1].total : 1;
  const maxAskTotal = book.asks.length > 0 ? book.asks[book.asks.length - 1].total : 1;
  const maxCumulative = Math.max(maxBidTotal, maxAskTotal, 0.001);

  // Take top 8 asks (reversed so lowest ask is at bottom near mid)
  const displayAsks = [...book.asks.slice(0, 8)].reverse();
  const displayBids = book.bids.slice(0, 8);

  return (
    <div className="bg-[#0f1420] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-xs text-white uppercase tracking-wider">
              Order Book (P0 Depth)
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
            <span>Spread: ${book.spread.toFixed(2)}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">{book.spreadBps.toFixed(1)} bps</span>
          </div>
        </div>

        {/* Table column headers */}
        <div className="grid grid-cols-3 text-[10px] uppercase font-mono text-slate-500 py-1.5 px-2 border-b border-slate-900">
          <div>Price (USD)</div>
          <div className="text-right">Size</div>
          <div className="text-right">Total Depth</div>
        </div>

        {/* Asks (Sells) */}
        <div className="space-y-0.5 my-1">
          {displayAsks.map((ask) => {
            const isSellWall = book.sellWalls.some((w) => Math.abs(w.price - ask.price) < 0.001);
            const depthWidth = Math.min(100, (ask.total / maxCumulative) * 100);

            return (
              <div
                key={`ask-${ask.price}`}
                className={`relative grid grid-cols-3 text-[11px] font-mono py-0.5 px-2 rounded transition-colors ${
                  isSellWall ? 'bg-rose-950/40 border border-rose-500/50' : 'hover:bg-slate-900/40'
                }`}
              >
                {/* Visual red depth background bar */}
                <div
                  className="absolute top-0 bottom-0 right-0 bg-rose-500/15 pointer-events-none rounded-r"
                  style={{ width: `${depthWidth}%` }}
                />

                <div className="text-rose-400 font-medium flex items-center gap-1 z-10">
                  <span>${ask.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                  {isSellWall && (
                    <span className="text-[9px] px-1 bg-rose-600 text-white font-bold rounded">WALL</span>
                  )}
                </div>
                <div className="text-right text-slate-300 z-10">{ask.amount.toFixed(4)}</div>
                <div className="text-right text-slate-500 z-10">{ask.total.toFixed(4)}</div>
              </div>
            );
          })}
        </div>

        {/* Mid-Price & Microprice Spread Bar */}
        <div className="my-2 py-1.5 px-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Mid:</span>
            <span className="font-bold text-white">${book.midPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
          </div>

          {/* Microprice Badge */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">Microprice:</span>
            <span
              className={`font-bold flex items-center gap-0.5 ${
                book.micropriceDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {book.micropriceDelta >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              ${book.microprice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </span>
          </div>
        </div>

        {/* Bids (Buys) */}
        <div className="space-y-0.5 my-1">
          {displayBids.map((bid) => {
            const isBuyWall = book.buyWalls.some((w) => Math.abs(w.price - bid.price) < 0.001);
            const depthWidth = Math.min(100, (bid.total / maxCumulative) * 100);

            return (
              <div
                key={`bid-${bid.price}`}
                className={`relative grid grid-cols-3 text-[11px] font-mono py-0.5 px-2 rounded transition-colors ${
                  isBuyWall ? 'bg-emerald-950/40 border border-emerald-500/50' : 'hover:bg-slate-900/40'
                }`}
              >
                {/* Visual green depth background bar */}
                <div
                  className="absolute top-0 bottom-0 right-0 bg-emerald-500/15 pointer-events-none rounded-r"
                  style={{ width: `${depthWidth}%` }}
                />

                <div className="text-emerald-400 font-medium flex items-center gap-1 z-10">
                  <span>${bid.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                  {isBuyWall && (
                    <span className="text-[9px] px-1 bg-emerald-600 text-white font-bold rounded">WALL</span>
                  )}
                </div>
                <div className="text-right text-slate-300 z-10">{bid.amount.toFixed(4)}</div>
                <div className="text-right text-slate-500 z-10">{bid.total.toFixed(4)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Summary */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500 mt-2">
        <span>Total Bids: <strong className="text-emerald-400">{book.totalBidDepth.toFixed(2)}</strong></span>
        <span>Total Asks: <strong className="text-rose-400">{book.totalAskDepth.toFixed(2)}</strong></span>
      </div>
    </div>
  );
};
