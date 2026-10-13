import React, { useState } from 'react';
import { KeyRound, ShieldCheck, AlertCircle, X, ExternalLink, Wallet, CheckCircle2, Lock } from 'lucide-react';
import { api } from '../services/api';
import { SpotWallet } from '../types/trading';

interface BitfinexCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  apiSecret: string;
  onSaveCredentials: (key: string, secret: string, wallets?: SpotWallet[]) => void;
  spotWallets: SpotWallet[];
}

export const BitfinexCredentialsModal: React.FC<BitfinexCredentialsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  apiSecret,
  onSaveCredentials,
  spotWallets,
}) => {
  const [inputKey, setInputKey] = useState(apiKey);
  const [inputSecret, setInputSecret] = useState(apiSecret);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    if (!inputKey.trim() || !inputSecret.trim()) {
      setTestResult({ success: false, message: 'Please enter both API Key and API Secret.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await api.validateApiCredentials(inputKey.trim(), inputSecret.trim());
      if (res.success) {
        setTestResult({
          success: true,
          message: `Successfully authenticated with Bitfinex! Found ${res.exchangeWallets?.length || 0} spot wallet balance(s).`,
        });
        onSaveCredentials(inputKey.trim(), inputSecret.trim(), res.exchangeWallets);
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Authentication rejected. Verify your API Key, Secret, and Bitfinex permissions.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Network error connecting to Bitfinex Auth API.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleQuickSave = () => {
    onSaveCredentials(inputKey.trim(), inputSecret.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#0f1420] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Bitfinex API Configuration</h3>
              <p className="text-[11px] text-slate-400">HMAC-SHA384 Spot Trading Authentication</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4">
          {/* Security Notice & Server IP Whitelist */}
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Client-Proxy Security:</span> API credentials are used
                strictly for signing Spot trading requests via local backend proxy. Never share your secret or enable
                Withdrawal permissions on your Bitfinex API keys.
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-xs flex items-center justify-between gap-2">
              <div className="text-[11px] text-cyan-200">
                <span className="font-semibold text-white">Bitfinex IP Whitelist: </span>
                <span>Bitfinex par API key banate waqt IP Whitelist ko ya to <strong>KHALI (Empty)</strong> rakhein ya yeh Server IP likhein:</span>
                <span className="font-mono font-bold text-cyan-300 ml-1">34.96.39.52</span>
              </div>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText('34.96.39.52')}
                className="px-2 py-1 rounded bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 text-[10px] font-mono shrink-0 transition-colors"
              >
                Copy IP
              </button>
            </div>
          </div>

          {/* Form Inputs */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Bitfinex API Key</label>
            <input
              type="text"
              placeholder="e.g. 5x71jK..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Bitfinex API Secret</label>
            <input
              type="password"
              placeholder="e.g. wQ89vX..."
              value={inputSecret}
              onChange={(e) => setInputSecret(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Status Message */}
          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
                testResult.success
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-950/40 text-rose-300 border-rose-500/40'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Connected Spot Wallets Preview */}
          {spotWallets.length > 0 && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300 mb-2">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Detected Spot Wallets:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {spotWallets.map((w) => (
                  <div
                    key={w.currency}
                    className="px-2 py-1 bg-slate-900 rounded text-[11px] font-mono border border-slate-800"
                  >
                    <span className="text-emerald-400 font-bold">{w.currency}:</span>{' '}
                    <span className="text-white">{w.available.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions Box */}
          <div className="text-[11px] text-slate-400 space-y-1 pt-1">
            <div className="font-semibold text-slate-300">How to generate Bitfinex API Keys:</div>
            <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
              <li>Log in to Bitfinex and navigate to API Key Management</li>
              <li>Enable Permissions: <strong>Orders: Read/Write</strong> and <strong>Wallets: Read</strong></li>
              <li>Leave <strong>Withdrawal: OFF</strong> for safety</li>
              <li>Generate key, paste credentials above, and click Test Connection</li>
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              setInputKey('');
              setInputSecret('');
              onSaveCredentials('', '');
            }}
            className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
          >
            Clear Credentials
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleQuickSave}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors"
            >
              Save Without Test
            </button>
            <button
              onClick={handleTestAndSave}
              disabled={testing}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              {testing ? 'Testing...' : 'Test & Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
