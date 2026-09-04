import React, { useState, useEffect, useMemo } from 'react';
import {
  ExternalLink,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Shield,
  Globe,
  Layers,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  CircleDot,
  CheckSquare,
  AlignLeft,
  Type,
  Hash,
  Star,
  Sliders,
} from 'lucide-react';
import { SurveySession, SurveyPage, QuestionAnswer, PageHistoryEntry } from '../types';

interface LiveScreenWindowProps {
  session: SurveySession | null;
  selectedPageIndex?: number;
  onSelectPageIndex?: (pageIndex: number) => void;
  className?: string;
  isStandalone?: boolean;
  fallbackSurveyUrl?: string;
  inspectedPage?: SurveyPage | null;
}

export const LiveScreenWindow: React.FC<LiveScreenWindowProps> = ({
  session,
  selectedPageIndex,
  onSelectPageIndex,
  className = '',
  isStandalone = false,
  fallbackSurveyUrl = '/api/mock-surveys/developer-tools',
  inspectedPage = null,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loadingHtml, setLoadingHtml] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [useDirectSrc, setUseDirectSrc] = useState<boolean>(false);
  const [showInspector, setShowInspector] = useState<boolean>(true);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  const currentPageIndex = selectedPageIndex ?? session?.currentPageIndex ?? 1;
  const history = session?.history || [];
  const sessionId = session?.sessionId;

  // Find history entry if user picked a past page
  const isViewingHistory = selectedPageIndex !== undefined && selectedPageIndex !== session?.currentPageIndex;
  const historyEntry = history.find(h => h.pageIndex === currentPageIndex);

  // Active page data from live session, history, or inspected pre-run page
  const activePageData: SurveyPage | null = useMemo(() => {
    if (isViewingHistory && historyEntry) {
      return {
        title: historyEntry.pageTitle,
        description: '',
        pageIndex: historyEntry.pageIndex,
        totalEstimatedPages: Math.max(historyEntry.pageIndex, session?.totalEstimatedPages || 1),
        actionUrl: historyEntry.url,
        formMethod: 'POST',
        hiddenFields: {},
        submitButtonLabel: 'Next',
        questions: historyEntry.answers.map(ans => ({
          id: ans.questionId,
          title: ans.questionText || `Question ${ans.questionId}`,
          text: ans.questionText || `Question ${ans.questionId}`,
          type: (ans.selectedValues?.length ? 'radio' : 'text') as any,
          required: true,
          options: ans.selectedValues?.map(val => ({ id: val, label: val, value: val })),
          fields: [],
        })),
        isInfoOnlyPage: false,
        isHiddenPage: false,
        isFinalPage: false,
        hasValidationErrors: false,
      };
    }
    return session?.currentPageData || inspectedPage;
  }, [isViewingHistory, historyEntry, session?.currentPageData, session?.totalEstimatedPages, inspectedPage]);

  // Current answers (either from session or history)
  const activeAnswers: QuestionAnswer[] = useMemo(() => {
    if (isViewingHistory && historyEntry) {
      return historyEntry.answers || [];
    }
    return session?.currentAnswers || [];
  }, [isViewingHistory, historyEntry, session?.currentAnswers]);

  // Determine target screen URL for fetching
  const screenTargetUrl = useMemo(() => {
    if (sessionId) {
      return `/api/survey/screen/${sessionId}?page=${currentPageIndex}&_r=${refreshKey}`;
    }
    const targetUrl = fallbackSurveyUrl || session?.surveyUrl || '/api/mock-surveys/developer-tools';
    return `/api/survey/preview-screen?url=${encodeURIComponent(targetUrl)}&_r=${refreshKey}`;
  }, [sessionId, currentPageIndex, fallbackSurveyUrl, session?.surveyUrl, refreshKey]);

  const displayUrl = useMemo(() => {
    if (isViewingHistory) return historyEntry?.url || session?.surveyUrl || 'Survey History';
    if (session?.currentPageData?.actionUrl) return session.currentPageData.actionUrl;
    if (session?.surveyUrl) return session.surveyUrl;
    return fallbackSurveyUrl;
  }, [isViewingHistory, historyEntry, session, fallbackSurveyUrl]);

  const displayTitle = useMemo(() => {
    if (isViewingHistory) return historyEntry?.pageTitle || `Page ${currentPageIndex}`;
    if (session?.currentPageData?.title) return session.currentPageData.title;
    if (inspectedPage?.title) return inspectedPage.title;
    return 'Survey Runner Screen';
  }, [isViewingHistory, historyEntry, session, inspectedPage]);

  // Fetch HTML directly to guarantee robust rendering via srcDoc
  useEffect(() => {
    let isMounted = true;
    setLoadingHtml(true);
    setLoadError(null);

    fetch(screenTargetUrl)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
        }
        return res.text();
      })
      .then((html) => {
        if (!isMounted) return;
        setHtmlContent(html);
        setLoadingHtml(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Failed to load screen HTML, will attempt fallback iframe src:', err.message);
        setLoadError(err.message);
        setLoadingHtml(false);
      });

    return () => {
      isMounted = false;
    };
  }, [screenTargetUrl, session?.status]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handlePopout = () => {
    const popoutUrl = sessionId
      ? `/api/survey/screen/${sessionId}?page=${currentPageIndex}`
      : `/api/survey/preview-screen?url=${encodeURIComponent(fallbackSurveyUrl)}`;
    window.open(popoutUrl, '_blank', 'width=1100,height=850,menubar=no,toolbar=no,location=yes');
  };

  const renderQuestionTypePill = (type?: string) => {
    switch (type) {
      case 'checkbox':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950/70 border border-purple-500/50 text-purple-300 font-mono text-[10px] font-bold">
            <CheckSquare className="w-3 h-3 text-purple-400" />
            <span>Multiple Choice (Checkbox)</span>
          </span>
        );
      case 'select':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/70 border border-blue-500/50 text-blue-300 font-mono text-[10px] font-bold">
            <ChevronDown className="w-3 h-3 text-blue-400" />
            <span>Dropdown (Select)</span>
          </span>
        );
      case 'textarea':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 font-mono text-[10px] font-bold">
            <AlignLeft className="w-3 h-3 text-emerald-400" />
            <span>Textarea</span>
          </span>
        );
      case 'text':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/70 border border-amber-500/50 text-amber-300 font-mono text-[10px] font-bold">
            <Type className="w-3 h-3 text-amber-400" />
            <span>Short Text</span>
          </span>
        );
      case 'number':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-950/70 border border-orange-500/50 text-orange-300 font-mono text-[10px] font-bold">
            <Hash className="w-3 h-3 text-orange-400" />
            <span>Number</span>
          </span>
        );
      case 'rating':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-950/70 border border-yellow-500/50 text-yellow-300 font-mono text-[10px] font-bold">
            <Star className="w-3 h-3 text-yellow-400" />
            <span>Rating</span>
          </span>
        );
      case 'scale':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-950/70 border border-teal-500/50 text-teal-300 font-mono text-[10px] font-bold">
            <Sliders className="w-3 h-3 text-teal-400" />
            <span>Scale</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/50 text-cyan-300 font-mono text-[10px] font-bold">
            <CircleDot className="w-3 h-3 text-cyan-400" />
            <span>Single Choice (Radio)</span>
          </span>
        );
    }
  };

  return (
    <div
      id="live-screen-window"
      className={`flex flex-col bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden shadow-2xl ${className}`}
    >
      {/* Window Chrome Title Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#080D1A] border-b border-[#1E293B] select-none">
        {/* Left: Window Control Dots & Identity */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-600/50 block shadow-sm"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600/50 block shadow-sm"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600/50 block shadow-sm"></span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 font-sans font-semibold">Live Survey Screen</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-300 font-medium line-clamp-1 max-w-[220px] sm:max-w-md">
              {displayTitle}
            </span>
          </span>
        </div>

        {/* Right: Window Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Question Inspector Toggle */}
          <button
            onClick={() => setShowInspector(!showInspector)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono font-bold transition-all border ${
              showInspector
                ? 'bg-purple-950/80 text-purple-300 border-purple-500/50 shadow-sm'
                : 'bg-[#1E293B] text-slate-400 border-transparent hover:text-slate-200'
            }`}
            title="Toggle Question Requirements & AI Intelligence Inspector"
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span className="hidden sm:inline">Requirements Inspector</span>
          </button>

          {/* Zoom controls */}
          <div className="hidden md:flex items-center gap-1 bg-[#030712] border border-[#1E293B] px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-400">
            <button
              onClick={() => setZoomLevel(prev => Math.max(60, prev - 10))}
              className="hover:text-white p-0.5 cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="w-8 text-center text-slate-300 font-bold">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(125, prev + 10))}
              className="hover:text-white p-0.5 cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/60 rounded transition-colors cursor-pointer"
            title="Reload survey screen"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHtml ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Pop out in new tab */}
          <button
            onClick={handlePopout}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded text-[11px] font-mono font-bold transition-all shadow-sm cursor-pointer"
            title="Open in real detached browser window"
          >
            <ExternalLink className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">Pop Out</span>
          </button>
        </div>
      </div>

      {/* Browser Navigation / Address Bar */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-2 bg-[#0C1322] border-b border-[#1E293B] text-xs font-mono">
        <div className="flex items-center gap-2 flex-1 min-w-0 bg-[#030712] border border-[#1E293B] rounded-md px-2.5 py-1 text-slate-300">
          <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] text-slate-400 truncate select-all">{displayUrl}</span>
          {!sessionId && (
            <span className="ml-auto px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-600/50 text-amber-300 text-[10px] uppercase font-bold shrink-0">
              Live Preview
            </span>
          )}
          {sessionId && (
            <span className="ml-auto px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 text-[10px] uppercase font-bold shrink-0">
              Active Runner
            </span>
          )}
        </div>

        {/* Page Switcher for previous screen states */}
        {history.length > 0 && onSelectPageIndex && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-500">Screen:</span>
            <select
              value={currentPageIndex}
              onChange={e => onSelectPageIndex(parseInt(e.target.value, 10))}
              className="bg-[#030712] border border-[#1E293B] text-emerald-400 text-xs rounded px-2 py-1 font-mono font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {history.map(h => (
                <option key={h.pageIndex} value={h.pageIndex}>
                  Page {h.pageIndex}: {h.pageTitle.slice(0, 20)} (Submitted)
                </option>
              ))}
              {session?.currentPageData && (
                <option value={session.currentPageIndex}>
                  Page {session.currentPageIndex}: Current Live Screen
                </option>
              )}
            </select>
          </div>
        )}
      </div>

      {/* TOP INSPECTOR: Question Requirements & AI Understanding Details */}
      {showInspector && activePageData && activePageData.questions.length > 0 && (
        <div className="bg-[#0b1220] border-b border-[#1E293B] p-3.5 space-y-2.5 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                Question Requirements & AI Understanding ({activePageData.questions.length} Questions)
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {activeAnswers.length} of {activePageData.questions.length} answered
            </span>
          </div>

          {/* Horizontal scrollable question pills / cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {activePageData.questions.map((q, idx) => {
              const ans = activeAnswers.find(a => a.questionId === q.id);
              const isSelected = selectedQuestionId === q.id || (!selectedQuestionId && idx === 0);

              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuestionId(q.id)}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#131e33] border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30'
                      : 'bg-[#060a14] border-[#1E293B] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-[#030712] border border-[#1E293B] text-[10px] font-mono font-bold text-slate-300">
                        Q{idx + 1} &bull; {q.id}
                      </span>
                      {renderQuestionTypePill(q.type)}
                      {q.required && (
                        <span className="text-rose-400 font-mono text-[10px] font-bold">
                          Required *
                        </span>
                      )}
                    </div>

                    {ans ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-mono text-[10px] font-bold shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Answered</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-600/50 text-amber-300 font-mono text-[10px] font-bold shrink-0">
                        <span>Pending</span>
                      </span>
                    )}
                  </div>

                  {/* Question Text */}
                  <div className="text-xs font-semibold text-slate-200 line-clamp-2 mb-1">
                    {q.text}
                  </div>

                  {/* Requirement instruction if available */}
                  {q.instruction && (
                    <div className="text-[11px] font-mono text-purple-300/90 mb-1">
                      Requirement: {q.instruction}
                    </div>
                  )}

                  {/* Selected Answer and AI Reasoning */}
                  {ans && (
                    <div className="mt-1.5 pt-1.5 border-t border-[#1E293B]/80 text-[11px] font-mono space-y-1">
                      <div className="text-emerald-300 font-medium">
                        Selected: <span className="font-bold underline">{ans.selectedValues?.join(', ') || ans.textResponse || 'N/A'}</span>
                      </div>
                      {ans.reasoning && (
                        <div className="text-slate-400 text-[10px] leading-relaxed line-clamp-2">
                          <span className="text-purple-400 font-bold">Reasoning:</span> {ans.reasoning}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Iframe Viewport */}
      <div className="relative flex-1 min-h-[520px] h-[640px] bg-white overflow-hidden">
        {loadingHtml && (
          <div className="absolute inset-0 bg-[#030712]/90 backdrop-blur-xs z-20 flex flex-col items-center justify-center text-slate-300 font-mono text-xs p-4 text-center">
            <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin mb-3" />
            <span className="font-bold text-slate-200 mb-1">Rendering Survey Screen...</span>
            <span className="text-slate-400 text-[11px] max-w-sm">
              Loading DOM elements, auto-answers, and interactive input highlights.
            </span>
          </div>
        )}

        {loadError && !htmlContent ? (
          <div className="absolute inset-0 bg-[#030712] z-10 flex flex-col items-center justify-center p-6 text-center text-slate-400 font-mono">
            <div className="w-12 h-12 rounded-xl bg-rose-950/50 border border-rose-800 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-rose-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-200 mb-1">Screen Load Error</h3>
            <p className="text-xs text-rose-400/90 max-w-md mb-4">{loadError}</p>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors cursor-pointer"
              >
                Retry Loading
              </button>
              <button
                onClick={() => setUseDirectSrc(true)}
                className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-slate-200 rounded text-xs transition-colors cursor-pointer"
              >
                Try Direct Iframe URL
              </button>
            </div>
          </div>
        ) : useDirectSrc ? (
          <iframe
            key={`direct_${screenTargetUrl}_${zoomLevel}`}
            src={screenTargetUrl}
            title={`Survey Screen Page ${currentPageIndex}`}
            className="w-full h-full border-none transition-transform origin-top-left"
            style={{
              transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
              width: zoomLevel !== 100 ? `${10000 / zoomLevel}%` : '100%',
              height: zoomLevel !== 100 ? `${10000 / zoomLevel}%` : '100%',
            }}
            sandbox="allow-same-origin allow-scripts allow-forms"
          />
        ) : (
          <iframe
            key={`doc_${currentPageIndex}_${refreshKey}_${zoomLevel}`}
            srcDoc={htmlContent}
            title={`Survey Screen Page ${currentPageIndex}`}
            className="w-full h-full border-none transition-transform origin-top-left"
            style={{
              transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
              width: zoomLevel !== 100 ? `${10000 / zoomLevel}%` : '100%',
              height: zoomLevel !== 100 ? `${10000 / zoomLevel}%` : '100%',
            }}
            sandbox="allow-same-origin allow-scripts allow-forms"
          />
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="px-3.5 py-2 bg-[#080D1A] border-t border-[#1E293B] flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              session?.status === 'delaying'
                ? 'bg-emerald-400 animate-ping'
                : session?.status === 'completed'
                ? 'bg-purple-400'
                : 'bg-emerald-400'
            }`}
          ></span>
          <span>
            {session?.status === 'delaying'
              ? 'Evaluating & Auto-filling questions on live DOM'
              : session?.status === 'submitting'
              ? 'Submitting form to survey endpoint...'
              : session?.status === 'completed'
              ? 'Survey sequence fully completed'
              : sessionId
              ? 'Survey session active & DOM monitored'
              : 'Survey Screen Preview Loaded'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-400">
          <span>
            Screen Page {currentPageIndex} of {Math.max(currentPageIndex, session?.totalEstimatedPages || 1)}
          </span>
          <span className="text-slate-600">&bull;</span>
          <button
            onClick={() => setUseDirectSrc(!useDirectSrc)}
            className="text-[10px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
          >
            Mode: {useDirectSrc ? 'Direct URL' : 'Embedded srcDoc'}
          </button>
        </div>
      </div>
    </div>
  );
};
