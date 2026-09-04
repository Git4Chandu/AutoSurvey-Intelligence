import React, { useState, useRef, useEffect } from 'react';
import { LogEntry } from '../types';
import { Terminal, Trash2, ArrowDownCircle, Filter } from 'lucide-react';

interface LiveTerminalLogsProps {
  logs: LogEntry[];
  onClear: () => void;
}

export const LiveTerminalLogs: React.FC<LiveTerminalLogsProps> = ({ logs, onClear }) => {
  const [filter, setFilter] = useState<'all' | 'delay' | 'gemini' | 'action'>('all');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    if (filter === 'delay') return log.level === 'delay';
    if (filter === 'gemini') return log.level === 'gemini';
    if (filter === 'action') return log.level === 'action' || log.level === 'success';
    return true;
  });

  const getLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'gemini':
        return <span className="text-emerald-400 font-mono font-bold">[GEMINI]</span>;
      case 'delay':
        return <span className="text-amber-400 font-mono font-bold">[DELAY]</span>;
      case 'action':
        return <span className="text-blue-400 font-mono font-bold">[ACTION]</span>;
      case 'success':
        return <span className="text-emerald-300 font-mono font-bold">[SUCCESS]</span>;
      case 'warn':
        return <span className="text-yellow-400 font-mono font-bold">[WARN]</span>;
      case 'error':
        return <span className="text-rose-400 font-mono font-bold">[ERROR]</span>;
      default:
        return <span className="text-slate-500 font-mono font-bold">[SYS]</span>;
    }
  };

  return (
    <div className="bg-[#030712] text-slate-100 rounded-xl border border-[#1E293B] shadow-2xl overflow-hidden flex flex-col h-[520px]">
      {/* Terminal Title Bar */}
      <div className="bg-[#0A0A0B] px-4 py-3 border-b border-[#1E293B] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            Real-Time Engine Telemetry
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#111827] border border-[#1E293B] text-emerald-400 font-mono">
            {logs.length} events
          </span>
        </div>

        {/* Filters and controls */}
        <div className="flex items-center gap-2 font-mono">
          <div className="flex items-center bg-[#111827] rounded-lg p-0.5 border border-[#1E293B] text-[11px]">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded ${
                filter === 'all' ? 'bg-[#1E293B] text-emerald-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('delay')}
              className={`px-2 py-0.5 rounded ${
                filter === 'delay' ? 'bg-amber-950/80 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Delay
            </button>
            <button
              onClick={() => setFilter('gemini')}
              className={`px-2 py-0.5 rounded ${
                filter === 'gemini' ? 'bg-emerald-950/80 text-emerald-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gemini
            </button>
            <button
              onClick={() => setFilter('action')}
              className={`px-2 py-0.5 rounded ${
                filter === 'action' ? 'bg-blue-950/80 text-blue-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              DOM
            </button>
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Auto-scroll is ON' : 'Auto-scroll is OFF'}
            className={`p-1.5 rounded-lg border transition-colors ${
              autoScroll
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                : 'bg-[#111827] text-slate-500 border-[#1E293B]'
            }`}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClear}
            title="Clear logs"
            className="p-1.5 rounded-lg bg-[#111827] text-slate-500 hover:text-rose-400 border border-[#1E293B] hover:border-[#334155] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Content Body */}
      <div ref={scrollRef} className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-2 bg-[#030712]">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 font-mono italic py-8 text-center">
            Awaiting execution logs and telemetry stream...
          </div>
        ) : (
          filteredLogs.map((log) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            const ms = String(log.timestamp % 1000).padStart(3, '0');

            return (
              <div key={log.id} className="leading-relaxed hover:bg-[#111827]/70 px-2 py-1 rounded transition-colors">
                <span className="text-slate-500 mr-2 text-[11px]">
                  {timeStr}.{ms}
                </span>
                <span className="mr-2">{getLevelBadge(log.level)}</span>
                <span className="text-slate-200">{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
