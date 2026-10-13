import React, { useState } from 'react';
import { Sparkles, X, Brain, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { OrderBookData, TradesData } from '../types/trading';

interface AiAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: OrderBookData | null;
  trades: TradesData | null;
  symbol: string;
}

export const AiAdvisorModal: React.FC<AiAdvisorModalProps> = ({
  isOpen,
  onClose,
  book,
  trades,
  symbol,
}) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunAnalysis = async () => {
    if (!book) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.analyzeMicrostructureWithAi({
        symbol,
        midPrice: book.midPrice,
        micropriceDelta: book.micropriceDelta,
        imbalance5: book.imbalance5,
        aggressiveBuyRatio: trades?.aggressiveBuyRatio || 50,
        spreadBps: book.spreadBps,
        sellWallsCount: book.sellWalls.length,
        buyWallsCount: book.buyWalls.length,
      });

      setAnalysis(res.analysis);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate AI analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#0f1420] border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0d111a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">AI Microstructure Quantitative Advisor</h3>
              <p className="text-[11px] text-slate-400">Powered by Gemini 2.5 Flash HFT Model</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Quick Metrics Badge */}
          {book && (
            <div className="grid grid-cols-3 gap-2 text-xs font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500 text-[10px] block">OFI Imbalance:</span>
                <span className="text-white font-bold">{book.imbalance5 > 0 ? '+' : ''}{book.imbalance5.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Microprice Skew:</span>
                <span className={`font-bold ${book.micropriceDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${book.micropriceDelta >= 0 ? '+' : ''}{book.micropriceDelta.toFixed(4)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Aggressive Taker:</span>
                <span className="text-amber-400 font-bold">{trades?.aggressiveBuyRatio.toFixed(1) || 50}%</span>
              </div>
            </div>
          )}

          {!analysis && !loading && !error && (
            <div className="text-center py-6">
              <Brain className="w-10 h-10 text-indigo-400/60 mx-auto mb-2" />
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                Run real-time institutional evaluation of current order book depth, liquidity walls, tape delta, and fee viability.
              </p>
              <button
                onClick={handleRunAnalysis}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
              >
                Evaluate Current Microstructure Now
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400">Analyzing Bitfinex order book skew & fee expectancy...</p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-500/40 text-xs">
              {error}
            </div>
          )}

          {analysis && !loading && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans">
                {analysis}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleRunAnalysis}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-evaluate Ticks</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
