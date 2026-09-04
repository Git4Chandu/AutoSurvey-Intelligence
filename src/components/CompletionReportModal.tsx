import React, { useState } from 'react';
import { SurveySession } from '../types';
import { CheckCircle2, Download, Copy, X, Clock, FileText, Sparkles, Layers, ExternalLink, Timer, ListFilter } from 'lucide-react';

interface CompletionReportModalProps {
  session: SurveySession;
  onClose: () => void;
}

export const CompletionReportModal: React.FC<CompletionReportModalProps> = ({ session, onClose }) => {
  const [activeTab, setActiveTab] = useState<'screens' | 'answers'>('screens');

  const allAnswers = [
    ...session.history.flatMap((h) => h.answers),
    ...session.currentAnswers,
  ];

  const totalTimeSec = ((session.completedAt || Date.now()) - session.startedAt) / 1000;
  const totalDelaySec = session.totalSimulatedDelayMs / 1000;

  const handleCopyJson = () => {
    const data = {
      surveyUrl: session.surveyUrl,
      completedAt: new Date(session.completedAt || Date.now()).toISOString(),
      confirmationMessage: session.confirmationMessage,
      persona: session.config.persona,
      engineMode: session.config.engineMode || 'hybrid',
      totalExecutionTimeSec: totalTimeSec,
      totalSimulatedDelaySec: totalDelaySec,
      screenResults: session.history.map((h) => ({
        pageIndex: h.pageIndex,
        screenTitle: h.pageTitle,
        url: h.url,
        timeTakenSeconds: h.pageDurationMs ? (h.pageDurationMs / 1000).toFixed(2) : ((h.pageDelayMs + 1000) / 1000).toFixed(2),
        simulatedDelaySeconds: (h.pageDelayMs / 1000).toFixed(2),
        inputsAnswered: h.answers.length,
      })),
      answers: allAnswers.map((a) => ({
        question: a.questionTitle,
        type: a.questionType,
        selectedValues: a.selectedValues,
        textResponse: a.textResponse,
        reasoning: a.reasoning,
        delayMetrics: a.delayBreakdown,
      })),
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  const handleDownloadJson = () => {
    const data = {
      surveyUrl: session.surveyUrl,
      completedAt: new Date(session.completedAt || Date.now()).toISOString(),
      confirmationMessage: session.confirmationMessage,
      persona: session.config.persona,
      engineMode: session.config.engineMode || 'hybrid',
      totalExecutionTimeSec: totalTimeSec,
      totalSimulatedDelaySec: totalDelaySec,
      screenResults: session.history.map((h) => ({
        pageIndex: h.pageIndex,
        screenTitle: h.pageTitle,
        url: h.url,
        timeTakenSeconds: h.pageDurationMs ? (h.pageDurationMs / 1000).toFixed(2) : ((h.pageDelayMs + 1000) / 1000).toFixed(2),
        simulatedDelaySeconds: (h.pageDelayMs / 1000).toFixed(2),
        inputsAnswered: h.answers.length,
      })),
      answers: allAnswers,
      history: session.history,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey-testing-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0B]/85 backdrop-blur-sm">
      <div className="bg-[#111827] rounded-xl border border-[#1E293B] shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-[#0F172A] border-b border-[#1E293B] flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md shadow-emerald-500/20 flex-shrink-0">
              <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block mb-0.5">
                AUTONOMOUS SURVEY TEST COMPLETED
              </span>
              <h2 className="text-lg font-bold text-white uppercase font-sans">Verification & Execution Results</h2>
              <p className="text-xs font-mono text-emerald-300/90 mt-0.5">
                {session.confirmationMessage || 'All questionnaire screens traversed, answered, validated and submitted.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 bg-[#030712] border-b border-[#1E293B]">
          <div className="bg-[#111827] p-3 rounded-lg border border-[#1E293B]">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
              Screens Answered
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-mono">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="text-base font-bold text-slate-100">
                {session.history.length || 1}
              </span>
            </div>
          </div>

          <div className="bg-[#111827] p-3 rounded-lg border border-[#1E293B]">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
              Total Inputs Mapped
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-mono">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="text-base font-bold text-slate-100">{allAnswers.length}</span>
            </div>
          </div>

          <div className="bg-[#111827] p-3 rounded-lg border border-[#1E293B]">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
              Total Duration
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-mono">
              <Timer className="w-4 h-4 text-amber-400" />
              <span className="text-base font-bold text-amber-400">{totalTimeSec.toFixed(1)}s</span>
            </div>
          </div>

          <div className="bg-[#111827] p-3 rounded-lg border border-[#1E293B]">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
              Answer Engine
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-mono">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-slate-300 uppercase truncate">
                {session.config.engineMode || 'Hybrid'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[#1E293B] bg-[#0F172A] px-6">
          <button
            onClick={() => setActiveTab('screens')}
            className={`py-3 px-4 text-xs font-mono font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'screens'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Screens Answered & Time Taken ({session.history.length})
          </button>
          <button
            onClick={() => setActiveTab('answers')}
            className={`py-3 px-4 text-xs font-mono font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'answers'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            Answered Inputs ({allAnswers.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#111827]">
          {activeTab === 'screens' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
                <span>Detailed per-screen telemetry and live hyperlinks:</span>
                <span>Average screen time: {(totalTimeSec / Math.max(session.history.length, 1)).toFixed(1)}s</span>
              </div>

              {session.history.length === 0 ? (
                <div className="text-center p-8 bg-[#030712] rounded-lg border border-[#1E293B] text-slate-400 font-mono text-xs">
                  Single-screen completion reached directly.
                </div>
              ) : (
                session.history.map((screen, idx) => {
                  const durationSec = screen.pageDurationMs
                    ? (screen.pageDurationMs / 1000).toFixed(1)
                    : ((screen.pageDelayMs + 800) / 1000).toFixed(1);
                  const delaySec = (screen.pageDelayMs / 1000).toFixed(1);

                  return (
                    <div
                      key={idx}
                      className="bg-[#030712] rounded-lg border border-[#1E293B] p-4 hover:border-[#334155] transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-md bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {screen.pageIndex}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-slate-200 font-sans">
                              {screen.pageTitle}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] font-mono text-slate-400">
                              <span className="text-emerald-400 font-bold">
                                {screen.answers.length} inputs answered
                              </span>
                              <span>•</span>
                              <span>Simulated delay: {delaySec}s</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <div className="px-2.5 py-1 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300 font-mono text-xs flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>{durationSec}s on screen</span>
                          </div>

                          {screen.url && (
                            <a
                              href={screen.url}
                              target="_blank"
                              rel="noreferrer"
                              title="Open Screen Target URL"
                              className="p-1.5 rounded bg-[#111827] border border-[#334155] text-slate-300 hover:text-emerald-400 hover:border-emerald-500/60 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Screen answers summary pills */}
                      {screen.answers.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#1E293B] flex flex-wrap gap-1.5">
                          {screen.answers.map((ans, aIdx) => (
                            <span
                              key={aIdx}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#111827] border border-[#1E293B] text-slate-300"
                            >
                              <strong className="text-slate-400">{ans.questionTitle.slice(0, 25)}:</strong>{' '}
                              <span className="text-emerald-300 font-bold">{ans.textResponse || ans.selectedValues.join(', ')}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {allAnswers.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#030712] rounded-lg border border-[#1E293B] p-3.5 hover:border-[#334155] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {idx + 1}. {item.questionTitle}
                    </span>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded">
                      {(item.delayBreakdown.totalMs / 1000).toFixed(1)}s delay
                    </span>
                  </div>

                  <div className="mt-2 text-xs font-mono text-emerald-300 bg-emerald-950/40 border border-emerald-900/50 px-2.5 py-1.5 rounded">
                    Response: {item.textResponse || item.selectedValues.join(', ')}
                  </div>

                  <div className="mt-2 text-xs text-slate-400 bg-[#0F172A] p-2.5 rounded border border-[#1E293B] flex items-start gap-1.5 font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong className="text-slate-300">Cognitive Reasoning:</strong> {item.reasoning}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-[#0F172A] border-t border-[#1E293B] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono uppercase tracking-wider text-slate-300 bg-[#030712] border border-[#1E293B] rounded-lg hover:bg-[#1E293B] transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              Copy Results JSON
            </button>
            <button
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono uppercase tracking-wider text-slate-300 bg-[#030712] border border-[#1E293B] rounded-lg hover:bg-[#1E293B] transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              Export Report
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md shadow-emerald-950 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

