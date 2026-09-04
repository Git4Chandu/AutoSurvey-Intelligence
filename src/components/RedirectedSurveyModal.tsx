import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Download,
  AlertTriangle,
  Layers,
  CheckCircle2,
  Clock,
  HelpCircle,
  Maximize2,
  Minimize2,
  Globe,
  FileText
} from 'lucide-react';
import { RedirectedSurveyArchive, QuestionAnswer } from '../types';

interface RedirectedSurveyModalProps {
  sessionId: string;
  archive: RedirectedSurveyArchive;
  onClose: () => void;
}

export const RedirectedSurveyModal: React.FC<RedirectedSurveyModalProps> = ({
  sessionId,
  archive,
  onClose,
}) => {
  const [activeView, setActiveView] = useState<'screen' | 'results' | 'split'>('split');
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const screenUrl = `/api/survey/archive-screen/${sessionId}/${archive.archiveId}`;

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(archive, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `survey_redirect_results_${archive.archiveId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePopoutScreen = () => {
    window.open(screenUrl, '_blank', 'width=1000,height=800,menubar=no,toolbar=no');
  };

  const snapshot = archive.lastPageSnapshot;
  const allAnswers: QuestionAnswer[] = archive.history.flatMap(h => h.answers);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`bg-[#0A0E1A] border-2 border-indigo-500/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl max-h-[92vh] h-[860px]'
        }`}
      >
        {/* Window Title Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0F172A] border-b border-[#1E293B] shrink-0">
          <div className="flex items-center gap-2.5">
            {/* Window control dots */}
            <div className="flex items-center gap-1.5 mr-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-600/50 block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600/50 block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600/50 block"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/60 uppercase tracking-wider">
                  Redirected Survey Window
                </span>
                <h2 className="text-sm font-bold text-white font-sans">
                  {archive.surveyTitle}
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Archived session results &bull; Saved before redirection to new survey
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switchers */}
            <div className="flex items-center bg-[#030712] border border-[#1E293B] rounded-lg p-0.5 text-xs font-mono">
              <button
                onClick={() => setActiveView('split')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeView === 'split' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Split View
              </button>
              <button
                onClick={() => setActiveView('screen')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeView === 'screen' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Last Screen
              </button>
              <button
                onClick={() => setActiveView('results')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeView === 'results' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Saved Results ({archive.totalQuestionsAnswered})
              </button>
            </div>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] rounded-lg transition-colors"
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              title="Close window"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Redirection Notice Banner */}
        <div className="bg-indigo-950/40 border-b border-indigo-900/60 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-900/60 border border-indigo-500/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-indigo-300 flex items-center gap-2">
                <span>SURVEY REDIRECT DETECTED</span>
                <span className="text-slate-500">&bull;</span>
                <span className="text-slate-300 font-normal">{archive.reason}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className="text-slate-500">Redirected to:</span>
                <span className="text-indigo-200 truncate max-w-md">{archive.redirectedToUrl}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#030712] hover:bg-[#111827] text-slate-200 border border-[#1E293B] rounded-lg text-xs font-mono transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={handlePopoutScreen}
              className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-mono font-bold transition-colors shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Detached Screen</span>
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* View: Screen View (or Left side of Split View) */}
          {(activeView === 'screen' || activeView === 'split') && (
            <div
              className={`flex flex-col border-b lg:border-b-0 lg:border-r border-[#1E293B] bg-[#030712] ${
                activeView === 'split' ? 'lg:w-1/2 h-1/2 lg:h-full' : 'w-full h-full'
              }`}
            >
              {/* Screen sub-header */}
              <div className="px-3.5 py-2 bg-[#0A0E1A] border-b border-[#1E293B] flex items-center justify-between text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold text-slate-200">Last Answered Page Screenshot / Screen</span>
                </div>
                <span className="text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded">
                  Page {snapshot.pageIndex}: {snapshot.pageTitle.slice(0, 20)}
                </span>
              </div>

              {/* Screen Iframe / Snapshot */}
              <div className="flex-1 relative overflow-hidden bg-white">
                <iframe
                  src={screenUrl}
                  title="Last Answered Page Snapshot"
                  className="w-full h-full border-none"
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>

              {/* Screen Footer */}
              <div className="px-3 py-1.5 bg-[#080D1A] border-t border-[#1E293B] text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Answers highlighted on DOM snapshot</span>
                <span>Submitted at: {new Date(snapshot.submittedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          )}

          {/* View: Results Table View (or Right side of Split View) */}
          {(activeView === 'results' || activeView === 'split') && (
            <div
              className={`flex flex-col bg-[#0A0E1A] overflow-y-auto ${
                activeView === 'split' ? 'lg:w-1/2 h-1/2 lg:h-full' : 'w-full h-full'
              }`}
            >
              {/* Header */}
              <div className="p-4 border-b border-[#1E293B] bg-[#0D1424] sticky top-0 z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-white uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>Saved Auto-Answering Results</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-mono text-xs font-bold">
                    {archive.totalQuestionsAnswered} Questions Answered
                  </span>
                </div>

                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="bg-[#030712] border border-[#1E293B] rounded-lg p-2">
                    <span className="text-[10px] text-slate-500 uppercase block">Pages</span>
                    <span className="font-bold text-slate-200">{archive.history.length} Completed</span>
                  </div>
                  <div className="bg-[#030712] border border-[#1E293B] rounded-lg p-2">
                    <span className="text-[10px] text-slate-500 uppercase block">Simulated Delay</span>
                    <span className="font-bold text-amber-400">{(archive.totalSimulatedDelayMs / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="bg-[#030712] border border-[#1E293B] rounded-lg p-2">
                    <span className="text-[10px] text-slate-500 uppercase block">Elapsed Time</span>
                    <span className="font-bold text-emerald-400">{(archive.totalDurationMs / 1000).toFixed(1)}s</span>
                  </div>
                </div>
              </div>

              {/* List of Questions Answered */}
              <div className="p-4 space-y-4">
                {allAnswers.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs font-mono">
                    No questions were recorded before redirection.
                  </div>
                ) : (
                  allAnswers.map((ans, idx) => (
                    <div
                      key={idx}
                      className="bg-[#111827] border border-[#1E293B] rounded-xl p-3.5 shadow-md hover:border-indigo-500/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/60 text-emerald-300 font-mono font-bold text-xs">
                            ID: {ans.questionId}
                          </span>
                          <span className="text-xs font-mono uppercase text-slate-400">
                            [{ans.questionType}]
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">
                          {ans.delayBreakdown.totalMs}ms delay
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-slate-100 mb-2.5 font-sans">
                        {ans.questionTitle}
                      </h4>

                      {/* Auto Answer Selected */}
                      <div className="bg-[#030712] border border-emerald-900/60 rounded-lg p-2.5 mb-2 text-xs font-mono">
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                          Auto-Selected Value:
                        </div>
                        <div className="text-emerald-300 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            {ans.textResponse
                              ? ans.textResponse
                              : ans.selectedValues.length > 0
                              ? ans.selectedValues.join(', ')
                              : 'Submitted without value'}
                          </span>
                        </div>
                      </div>

                      {/* Reasoning */}
                      {ans.reasoning && (
                        <div className="text-[11px] font-mono text-slate-400 bg-[#080D1A] rounded p-2 border border-[#1E293B]">
                          <span className="text-slate-500 font-bold">Reasoning: </span>
                          {ans.reasoning}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#0F172A] border-t border-[#1E293B] flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Survey results safely saved in archive memory.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-white rounded-lg font-bold transition-colors cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
