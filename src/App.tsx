import React, { useState, useEffect, useRef } from 'react';
import {
  SurveySession,
  SimulationConfig,
  SessionStatus,
  SurveyPage,
  RedirectedSurveyArchive
} from './types';
import { Header } from './components/Header';
import { UrlInputBar } from './components/UrlInputBar';
import { SimulationSettings } from './components/SimulationSettings';
import { LiveDelayCountdown } from './components/LiveDelayCountdown';
import { QuestionsView } from './components/QuestionsView';
import { LiveTerminalLogs } from './components/LiveTerminalLogs';
import { CompletionReportModal } from './components/CompletionReportModal';
import { LiveScreenWindow } from './components/LiveScreenWindow';
import { RedirectedSurveyModal } from './components/RedirectedSurveyModal';
import {
  FileText,
  Terminal,
  ExternalLink,
  CheckCircle,
  Sparkles,
  Layers,
  ShieldCheck,
  HelpCircle,
  Globe,
  AlertTriangle,
  Monitor,
  LayoutDashboard
} from 'lucide-react';

const DEFAULT_CONFIG: SimulationConfig = {
  persona: 'tech_pro',
  delayProfile: 'realistic',
  minDelaySec: 1.8,
  maxDelaySec: 4.5,
  readingSpeedWpm: 230,
  simulateKeystrokes: true,
  autoAdvance: true,
  requireConfirmBeforeSubmit: false,
};

export default function App() {
  const [url, setUrl] = useState<string>('/api/mock-surveys/confirmit-simulation');
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [session, setSession] = useState<SurveySession | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'split' | 'questions' | 'screen' | 'terminal'>('split');
  const [selectedScreenPageIndex, setSelectedScreenPageIndex] = useState<number | undefined>(undefined);
  const [activeRedirectModalArchive, setActiveRedirectModalArchive] = useState<RedirectedSurveyArchive | null>(null);
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [inspectedPage, setInspectedPage] = useState<SurveyPage | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Close SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Pre-inspect default survey URL on mount so survey DOM and question requirements load immediately
  useEffect(() => {
    handleInspect(url);
  }, []);

  // Listen for session completion to pop up completion modal
  useEffect(() => {
    if (session?.status === 'completed') {
      setShowCompletionModal(true);
    }
  }, [session?.status]);

  // Listen for redirected survey archive to display separate window
  useEffect(() => {
    if (session?.latestRedirectedArchive) {
      setActiveRedirectModalArchive(session.latestRedirectedArchive);
    }
  }, [session?.latestRedirectedArchive?.archiveId]);

  const connectToStream = (sessionId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sse = new EventSource(`/api/survey/stream/${sessionId}`);
    eventSourceRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const updatedSession: SurveySession = JSON.parse(event.data);
        setSession(updatedSession);
        if (updatedSession.status === 'completed' || updatedSession.status === 'error') {
          sse.close();
        }
      } catch (err) {
        console.error('Failed to parse SSE payload:', err);
      }
    };

    sse.onerror = () => {
      sse.close();
    };
  };

  const handleStart = async () => {
    if (!url.trim()) return;
    setInspectedPage(null);

    try {
      const res = await fetch('/api/survey/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), config }),
      });

      const data = await res.json();
      if (data.session) {
        setSession(data.session);
        connectToStream(data.sessionId);
      }
    } catch (err) {
      console.error('Error starting survey run:', err);
    }
  };

  const handlePause = async () => {
    if (!session) return;
    setSession(prev => prev ? { ...prev, status: 'paused' } : null);
    try {
      await fetch(`/api/survey/pause/${session.sessionId}`, { method: 'POST' });
    } catch (err) {
      console.error('Pause failed:', err);
    }
  };

  const handleResume = async () => {
    if (!session) return;
    setSession(prev => prev ? { ...prev, status: 'delaying' } : null);
    try {
      await fetch(`/api/survey/resume/${session.sessionId}`, { method: 'POST' });
    } catch (err) {
      console.error('Resume failed:', err);
    }
  };

  const handleStop = async () => {
    if (!session) return;
    setSession(prev => prev ? { ...prev, status: 'error', errorMessage: 'Execution halted by user.' } : null);
    try {
      await fetch(`/api/survey/stop/${session.sessionId}`, { method: 'POST' });
    } catch (err) {
      console.error('Stop failed:', err);
    } finally {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    }
  };

  const handleInspect = async (targetUrl?: string) => {
    const inspectUrl = (targetUrl || url).trim();
    if (!inspectUrl) return;
    setIsInspecting(true);

    try {
      const res = await fetch('/api/survey/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inspectUrl }),
      });
      const data = await res.json();
      if (data.page) {
        setInspectedPage(data.page);
      } else if (targetUrl === undefined) {
        if (data.isCompleted) {
          alert(data.completionMessage || 'This survey page is already completed!');
        } else {
          alert('Could not find survey questions on this page.');
        }
      }
    } catch (err: any) {
      if (targetUrl === undefined) {
        alert(`Inspection failed: ${err.message}`);
      }
    } finally {
      setIsInspecting(false);
    }
  };

  const handleClearLogs = () => {
    if (session) {
      setSession({ ...session, logs: [] });
    }
  };

  const currentStatus: SessionStatus = session?.status || 'idle';
  const displayPageData = session?.currentPageData || inspectedPage;

  return (
    <div className="h-screen overflow-hidden bg-[#0A0A0B] text-slate-100 font-sans flex flex-col selection:bg-emerald-900 selection:text-emerald-100">
      {/* Header bar */}
      <Header
        status={currentStatus}
        totalQuestionsAnswered={session?.totalQuestionsAnswered || 0}
        totalSimulatedDelayMs={session?.totalSimulatedDelayMs || 0}
        currentPageIndex={session?.currentPageIndex || 1}
        totalEstimatedPages={session?.totalEstimatedPages || 1}
      />

      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5">
        {/* Survey URL Input & Controls */}
        <UrlInputBar
          url={url}
          setUrl={setUrl}
          status={currentStatus}
          config={config}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          onInspect={handleInspect}
          isInspecting={isInspecting}
          toggleSettings={() => setShowSettings(!showSettings)}
          showSettings={showSettings}
        />

        {/* Behavior and Delay Settings drawer */}
        {showSettings && (
          <SimulationSettings
            config={config}
            onChange={setConfig}
            disabled={['fetching', 'answering', 'delaying', 'submitting'].includes(currentStatus)}
          />
        )}

        {/* Live Delay Countdown banner */}
        <LiveDelayCountdown activeDelay={session?.activeDelay} />

        {/* Inspection banner if inspecting without running */}
        {inspectedPage && !session && (
          <div className="bg-[#030712] border border-blue-900/60 rounded-xl p-3.5 text-xs text-blue-300 font-mono flex items-center justify-between">
            <span className="font-medium">
              🔍 DOM PARSE READY: Extracted {inspectedPage.questions.length} questions from &ldquo;{inspectedPage.title}&rdquo;.
            </span>
            <button
              onClick={handleStart}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer"
            >
              Initiate Run
            </button>
          </div>
        )}

        {/* Error notification banner if encountered */}
        {session?.status === 'error' && session.errorMessage && (
          <div className="bg-rose-950/40 border border-rose-900/80 rounded-xl p-4 text-xs text-rose-300 font-mono flex items-start gap-3">
            <span className="font-bold uppercase tracking-wider">[RUNTIME ERROR]:</span>
            <span>{session.errorMessage}</span>
          </div>
        )}

        {/* Main Workspace Tabs */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-px flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('split')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider rounded-t-lg border-t border-x transition-all ${
                activeTab === 'split'
                  ? 'bg-[#111827] border-[#1E293B] text-emerald-400 -mb-px border-b-[#111827] z-10 shadow-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Split View (Live Screen + Questions)</span>
              {session?.status === 'delaying' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('questions')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider rounded-t-lg border-t border-x transition-all ${
                activeTab === 'questions'
                  ? 'bg-[#111827] border-[#1E293B] text-emerald-400 -mb-px border-b-[#111827] z-10 shadow-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Questions & Rationale</span>
              {session && session.currentAnswers.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-[#030712] border border-[#1E293B] text-emerald-400 text-[10px] font-mono">
                  {session.totalQuestionsAnswered}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('screen')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider rounded-t-lg border-t border-x transition-all ${
                activeTab === 'screen'
                  ? 'bg-[#111827] border-[#1E293B] text-emerald-400 -mb-px border-b-[#111827] z-10 shadow-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>Live Screen Full Window</span>
              {session?.status === 'delaying' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('terminal')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider rounded-t-lg border-t border-x transition-all ${
                activeTab === 'terminal'
                  ? 'bg-[#111827] border-[#1E293B] text-emerald-400 -mb-px border-b-[#111827] z-10 shadow-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Execution Telemetry</span>
              {session?.logs && session.logs.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-[#030712] border border-[#1E293B] text-emerald-400 text-[10px] font-mono">
                  {session.logs.length}
                </span>
              )}
            </button>
          </div>

          {/* Redirected Surveys Indicator Button */}
          {session?.redirectedSurveys && session.redirectedSurveys.length > 0 && (
            <button
              onClick={() => setActiveRedirectModalArchive(session.redirectedSurveys[session.redirectedSurveys.length - 1])}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/60 text-indigo-300 rounded-lg text-xs font-mono font-bold transition-all shadow-md cursor-pointer mb-1 animate-pulse"
              title="View archived results and screenshot of survey before redirection"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Saved Redirected Survey ({session.redirectedSurveys.length})</span>
            </button>
          )}
        </div>

        {/* Tab Contents — flex-1 so this area fills all remaining viewport height */}
        <div className="flex-1 min-h-0 pt-2 flex flex-col">
          {/* Split View: Questions + Live Screen Window Side-by-Side */}
          {activeTab === 'split' && (
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-stretch">
              {/* Left column: Questions and Rationale */}
              <div className="lg:col-span-5 space-y-4 min-h-0 overflow-y-auto">
                <QuestionsView
                  currentPageData={displayPageData}
                  currentAnswers={session?.currentAnswers || []}
                  history={session?.history || []}
                  activeDelay={session?.activeDelay}
                  isCompleted={session?.status === 'completed'}
                  onViewStageScreen={(pageIndex) => {
                    setSelectedScreenPageIndex(pageIndex);
                  }}
                />
              </div>

              {/* Right column: Interactive Live Screen Window — fills full column height */}
              <div className="lg:col-span-7 flex flex-col min-h-0">
                <LiveScreenWindow
                  session={session}
                  selectedPageIndex={selectedScreenPageIndex}
                  onSelectPageIndex={setSelectedScreenPageIndex}
                  fallbackSurveyUrl={url}
                  inspectedPage={inspectedPage}
                  className="flex-1 min-h-0"
                />
              </div>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 columns: Questions and Answers */}
              <div className="lg:col-span-2">
                <QuestionsView
                  currentPageData={displayPageData}
                  currentAnswers={session?.currentAnswers || []}
                  history={session?.history || []}
                  activeDelay={session?.activeDelay}
                  isCompleted={session?.status === 'completed'}
                  onViewStageScreen={(pageIndex) => {
                    setSelectedScreenPageIndex(pageIndex);
                    setActiveTab('screen');
                  }}
                />
              </div>

              {/* Right column: Quick Side Metrics & Explanations */}
              <div className="space-y-4">
                {/* Live Screen Mini-Window Card */}
                <div className="bg-[#111827] rounded-xl border border-[#1E293B] p-4 shadow-xl">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2 text-slate-300 font-mono font-bold text-xs uppercase tracking-wider">
                      <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                      Live Screen Preview
                    </div>
                    <button
                      onClick={() => setActiveTab('screen')}
                      className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold cursor-pointer"
                    >
                      Maximize <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="p-2.5 bg-[#030712] border border-[#1E293B] rounded-lg text-xs font-mono text-slate-300 space-y-3">
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Survey page loaded with form inputs, radio selections, and requirement highlights.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveTab('split')}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        <span>Open Split View</span>
                      </button>
                      <button
                        onClick={() => {
                          const popUrl = session?.sessionId
                            ? `/api/survey/screen/${session.sessionId}`
                            : `/api/survey/preview-screen?url=${encodeURIComponent(url)}`;
                          window.open(popUrl, '_blank', 'width=1100,height=850');
                        }}
                        className="px-2.5 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-slate-200 rounded text-xs transition-colors cursor-pointer"
                        title="Open detached window"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Active Persona Card */}
                <div className="bg-[#111827] rounded-xl border border-[#1E293B] p-4 shadow-xl">
                  <div className="flex items-center gap-2 text-slate-300 font-mono font-bold text-xs uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    Target Persona Archetype
                  </div>
                  <div className="p-3 bg-[#030712] border border-purple-900/40 rounded-lg text-xs font-mono text-purple-200">
                    <div className="font-bold capitalize mb-1 text-purple-300">
                      {config.persona.replace('_', ' ')} Profile
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Gemini formulates context-aware choices and subjective text responses
                      matching this background, maintaining psychological consistency across questions.
                    </p>
                  </div>
                </div>

                {/* Delay & Human Behavior Card */}
                <div className="bg-[#111827] rounded-xl border border-[#1E293B] p-4 shadow-xl">
                  <div className="flex items-center gap-2 text-slate-300 font-mono font-bold text-xs uppercase tracking-wider mb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Heuristic Variance Engine
                  </div>
                  <div className="space-y-2 text-xs font-mono text-slate-400">
                    <div className="flex justify-between py-1 border-b border-[#1E293B]">
                      <span>Timing Profile:</span>
                      <span className="font-bold text-slate-200 capitalize">
                        {config.delayProfile}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#1E293B]">
                      <span>Hesitation Jitter:</span>
                      <span className="font-bold text-amber-400">
                        {config.minDelaySec}s - {config.maxDelaySec}s
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#1E293B]">
                      <span>Reading Speed:</span>
                      <span className="font-bold text-slate-200">
                        {config.readingSpeedWpm} WPM (dynamic)
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#1E293B]">
                      <span>Keystroke Simulation:</span>
                      <span className="font-bold text-emerald-400">
                        {config.simulateKeystrokes ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Auto-Advance Pipeline:</span>
                      <span className="font-bold text-blue-400">
                        {config.autoAdvance ? 'Autonomous' : 'Manual Approval'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Survey Screen Window Tab */}
          {activeTab === 'screen' && (
            <div className="space-y-4">
              <LiveScreenWindow
                session={session}
                selectedPageIndex={selectedScreenPageIndex}
                onSelectPageIndex={setSelectedScreenPageIndex}
                fallbackSurveyUrl={url}
                inspectedPage={inspectedPage}
              />
            </div>
          )}

          {activeTab === 'terminal' && (
            <LiveTerminalLogs logs={session?.logs || []} onClear={handleClearLogs} />
          )}
        </div>
      </main>

      {/* Redirected Survey Results Window / Modal */}
      {activeRedirectModalArchive && session && (
        <RedirectedSurveyModal
          sessionId={session.sessionId}
          archive={activeRedirectModalArchive}
          onClose={() => setActiveRedirectModalArchive(null)}
        />
      )}

      {/* Completion Report Modal */}
      {showCompletionModal && session && (
        <CompletionReportModal
          session={session}
          onClose={() => setShowCompletionModal(false)}
        />
      )}
    </div>
  );
}
