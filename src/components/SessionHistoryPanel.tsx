import React, { useCallback, useEffect, useState } from 'react';
import { Clock3, History, RefreshCw, FolderOpen, CheckCircle2, XCircle, PauseCircle, Maximize2, X } from 'lucide-react';
import { SessionStatus, SurveySession } from '../types';

interface SessionSummary {
  sessionId: string;
  surveyUrl: string;
  status: SessionStatus;
  startedAt: number;
  completedAt?: number;
  currentPageIndex: number;
  totalQuestionsAnswered: number;
  totalSimulatedDelayMs: number;
}

interface SessionHistoryPanelProps {
  activeSessionId?: string;
  onLoad: (session: SurveySession) => void;
}

const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString();

const statusClasses: Record<SessionStatus, string> = {
  idle: 'text-slate-400 border-slate-700 bg-slate-950/40',
  fetching: 'text-blue-300 border-blue-800/60 bg-blue-950/30',
  parsing: 'text-blue-300 border-blue-800/60 bg-blue-950/30',
  answering: 'text-emerald-300 border-emerald-800/60 bg-emerald-950/30',
  delaying: 'text-amber-300 border-amber-800/60 bg-amber-950/30',
  submitting: 'text-purple-300 border-purple-800/60 bg-purple-950/30',
  advancing: 'text-purple-300 border-purple-800/60 bg-purple-950/30',
  completed: 'text-emerald-300 border-emerald-800/60 bg-emerald-950/30',
  paused: 'text-amber-300 border-amber-800/60 bg-amber-950/30',
  aborted: 'text-rose-300 border-rose-800/60 bg-rose-950/30',
  error: 'text-rose-300 border-rose-800/60 bg-rose-950/30',
};

export const SessionHistoryPanel: React.FC<SessionHistoryPanelProps> = ({
  activeSessionId,
  onLoad,
}) => {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [fullView, setFullView] = useState(false);

  useEffect(() => {
    if (!fullView) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [fullView]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/survey/history?limit=100');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load session history.');
      setSessions(data.sessions || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load session history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory, activeSessionId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadHistory();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [loadHistory]);

  const handleLoad = async (sessionId: string) => {
    setMessage('');
    try {
      const response = await fetch(`/api/survey/status/${sessionId}`);
      const session = await response.json();
      if (!response.ok) throw new Error(session.error || 'Could not load the selected session.');
      onLoad(session as SurveySession);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load the selected session.');
    }
  };

  return (
    <section className={`${fullView ? 'fixed inset-0 z-50 overflow-y-auto overscroll-contain rounded-none p-3 sm:p-6' : 'w-full rounded-xl p-4 sm:p-5'} border border-[#1E293B] bg-[#111827] shadow-2xl`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#1E293B] pb-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-emerald-400" />
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">
            Session History
          </h2>
          <span className="rounded bg-[#030712] px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
            {sessions.length} saved
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadHistory()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#334155] bg-[#030712] px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {!fullView ? (
            <button
              type="button"
              onClick={() => setFullView(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-800/70 bg-emerald-950/40 px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-900/60"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Full View
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setFullView(false)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-[#030712] px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
              Dismiss
            </button>
          )}
        </div>
      </div>

      {message && <p className="mb-3 text-xs text-rose-300">{message}</p>}
      {!loading && sessions.length === 0 && (
        <p className="py-5 text-center text-xs font-mono text-slate-500">
          No saved survey sessions yet.
        </p>
      )}

      {sessions.length > 0 && (
        <div className="w-full min-w-0">
          <div className="hidden grid-cols-[minmax(0,2fr)_auto_auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#1E293B] px-2 py-2 text-[10px] uppercase tracking-wider text-slate-500 sm:grid">
            <span>Survey / Session</span>
            <span>Status</span>
            <span>Progress</span>
            <span>Started</span>
            <span className="text-right">Action</span>
          </div>
          <div className="space-y-2 sm:space-y-0">
            {sessions.map(session => (
              <div key={session.sessionId} className="grid min-w-0 grid-cols-1 gap-2 rounded-lg border border-[#1E293B]/70 p-3 hover:bg-[#0F172A] sm:grid-cols-[minmax(0,2fr)_auto_auto_minmax(0,1fr)_auto] sm:items-center sm:gap-3 sm:rounded-none sm:border-0 sm:border-b">
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs text-slate-200" title={session.surveyUrl}>{session.surveyUrl}</div>
                  <div className="mt-1 truncate font-mono text-[10px] text-slate-500">{session.sessionId}</div>
                </div>
                <span className={`inline-flex w-fit items-center gap-1 rounded border px-2 py-1 text-[10px] font-mono font-bold uppercase ${statusClasses[session.status]}`}>
                  {session.status === 'completed' ? <CheckCircle2 className="h-3 w-3" /> : session.status === 'paused' ? <PauseCircle className="h-3 w-3" /> : session.status === 'error' || session.status === 'aborted' ? <XCircle className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
                  {session.status}
                  {['fetching', 'parsing', 'answering', 'delaying', 'submitting', 'advancing', 'paused'].includes(session.status) && <span className="ml-1 text-[9px]">LIVE</span>}
                </span>
                <div className="font-mono text-xs text-slate-400">
                  <span>Page {session.currentPageIndex}</span>
                  <span className="ml-2 text-[10px] text-emerald-400">{session.totalQuestionsAnswered} answered</span>
                  <span className="ml-2 text-[10px] text-amber-300">{(session.totalSimulatedDelayMs / 1000).toFixed(1)}s delay</span>
                </div>
                <div className="truncate font-mono text-[10px] text-slate-500">{formatDate(session.startedAt)}</div>
                <button
                  type="button"
                  onClick={() => void handleLoad(session.sessionId)}
                  className="inline-flex w-fit items-center gap-1.5 rounded-md border border-emerald-800/70 bg-emerald-950/40 px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-900/60 sm:justify-self-end"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  Load
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
