import React from 'react';
import { LogEntry } from '../types/trading';
import { Terminal, Download, Trash2 } from 'lucide-react';

interface AuditLogProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const AuditLog: React.FC<AuditLogProps> = ({ logs, onClearLogs }) => {
  const handleExportCsv = () => {
    if (logs.length === 0) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Timestamp,Type,Message']
        .concat(logs.map((l) => `"${l.time}","${l.type}","${l.message.replace(/"/g, '""')}"`))
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bitfinex_hft_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#0f1420] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-xs text-white uppercase tracking-wider">
              Millisecond Execution Audit Log
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={logs.length === 0}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 disabled:opacity-40 transition-colors"
              title="Download audit log as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClearLogs}
              disabled={logs.length === 0}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 disabled:opacity-40 transition-colors"
              title="Clear log"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Logs container */}
        <div className="space-y-1 max-h-[220px] overflow-y-auto scrollbar-thin my-2 pr-1 font-mono text-[11px]">
          {logs.length === 0 ? (
            <div className="text-slate-600 text-center py-6">No execution events recorded yet</div>
          ) : (
            logs.map((log) => {
              let badgeColor = 'text-slate-400 bg-slate-900';
              if (log.type === 'PROFIT') badgeColor = 'text-emerald-400 bg-emerald-950/50 border border-emerald-500/30';
              if (log.type === 'EXECUTION') badgeColor = 'text-cyan-300 bg-cyan-950/40 border border-cyan-500/30';
              if (log.type === 'SIGNAL') badgeColor = 'text-amber-400 bg-amber-950/40 border border-amber-500/30';
              if (log.type === 'WARNING') badgeColor = 'text-rose-400 bg-rose-950/40 border border-rose-500/30';
              if (log.type === 'ERROR') badgeColor = 'text-rose-500 bg-rose-950 border border-rose-600';

              return (
                <div key={log.id} className="flex items-start gap-2 py-0.5 hover:bg-slate-900/40 px-1 rounded">
                  <span className="text-slate-500 text-[10px] shrink-0 pt-0.5">{log.time}</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded uppercase font-bold shrink-0 ${badgeColor}`}>
                    {log.type}
                  </span>
                  <span className="text-slate-300 break-words flex-1">{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-500 flex justify-between">
        <span>Recorded events: {logs.length}</span>
        <span>High-precision sub-second event logger</span>
      </div>
    </div>
  );
};
