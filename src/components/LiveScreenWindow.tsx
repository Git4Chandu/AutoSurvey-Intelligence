import React, { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw, ZoomIn, ZoomOut, Maximize2, Shield, Globe, Layers } from 'lucide-react';
import { SurveySession, PageHistoryEntry } from '../types';

interface LiveScreenWindowProps {
  session: SurveySession | null;
  selectedPageIndex?: number;
  onSelectPageIndex?: (pageIndex: number) => void;
  className?: string;
  isStandalone?: boolean;
}

export const LiveScreenWindow: React.FC<LiveScreenWindowProps> = ({
  session,
  selectedPageIndex,
  onSelectPageIndex,
  className = '',
  isStandalone = false,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);

  const currentPageIndex = selectedPageIndex ?? session?.currentPageIndex ?? 1;
  const history = session?.history || [];
  const sessionId = session?.sessionId;

  // Compute current display URL & title
  const isViewingHistory = selectedPageIndex !== undefined && selectedPageIndex !== session?.currentPageIndex;
  const historyEntry = history.find(h => h.pageIndex === currentPageIndex);

  const displayUrl = isViewingHistory
    ? historyEntry?.url || session?.surveyUrl || 'http://localhost:3000'
    : session?.currentPageData?.actionUrl || session?.surveyUrl || 'http://localhost:3000';

  const displayTitle = isViewingHistory
    ? historyEntry?.pageTitle || `Page ${currentPageIndex}`
    : session?.currentPageData?.title || `Page ${currentPageIndex}`;

  const screenUrl = sessionId
    ? `/api/survey/screen/${sessionId}?page=${currentPageIndex}&_r=${refreshKey}`
    : '';

  const handlePopout = () => {
    if (!sessionId) return;
    const popoutUrl = `/api/survey/screen/${sessionId}?page=${currentPageIndex}`;
    window.open(popoutUrl, '_blank', 'width=1000,height=800,menubar=no,toolbar=no,location=yes');
  };

  const handleRefresh = () => {
    setIframeLoaded(false);
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    setIframeLoaded(false);
  }, [currentPageIndex, session?.status, refreshKey]);

  return (
    <div
      id="live-screen-window"
      className={`flex flex-col bg-[#0F172A] border border-[#1E293B] rounded-xl overflow-hidden shadow-2xl ${className}`}
    >
      {/* Window Chrome Title Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#080D1A] border-b border-[#1E293B] select-none">
        {/* Left: Window Control Dots */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-600/50 block shadow-sm"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600/50 block shadow-sm"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600/50 block shadow-sm"></span>
          </div>
          <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 font-sans font-semibold">Survey Screen Window</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400 font-normal line-clamp-1 max-w-[200px] sm:max-w-xs">{displayTitle}</span>
          </span>
        </div>

        {/* Right: Window Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-[#030712] border border-[#1E293B] px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-400">
            <button
              onClick={() => setZoomLevel(prev => Math.max(60, prev - 10))}
              className="hover:text-white p-0.5"
              title="Zoom out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="w-8 text-center text-slate-300 font-bold">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(125, prev + 10))}
              className="hover:text-white p-0.5"
              title="Zoom in"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/60 rounded transition-colors"
            title="Reload screen"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${!iframeLoaded && sessionId ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={handlePopout}
            className="flex items-center gap-1 px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded text-[11px] font-mono font-bold transition-all shadow-sm cursor-pointer"
            title="Open in real detached browser window"
          >
            <ExternalLink className="w-3 h-3 text-emerald-400" />
            <span className="hidden md:inline">Pop Out Window</span>
          </button>
        </div>
      </div>

      {/* Browser Navigation / Address Bar */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-2 bg-[#0C1322] border-b border-[#1E293B] text-xs font-mono">
        <div className="flex items-center gap-2 flex-1 min-w-0 bg-[#030712] border border-[#1E293B] rounded-md px-2.5 py-1 text-slate-300">
          <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] text-slate-400 truncate select-all">{displayUrl}</span>
        </div>

        {/* Page Switcher if history exists */}
        {history.length > 0 && onSelectPageIndex && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-500">Screen:</span>
            <select
              value={currentPageIndex}
              onChange={e => onSelectPageIndex(parseInt(e.target.value, 10))}
              className="bg-[#030712] border border-[#1E293B] text-emerald-400 text-xs rounded px-2 py-1 font-mono font-bold focus:outline-none focus:border-emerald-500"
            >
              {history.map(h => (
                <option key={h.pageIndex} value={h.pageIndex}>
                  Page {h.pageIndex}: {h.pageTitle.slice(0, 18)}... (Submitted)
                </option>
              ))}
              {session?.currentPageData && (
                <option value={session.currentPageIndex}>
                  Page {session.currentPageIndex}: Current Active Screen
                </option>
              )}
            </select>
          </div>
        )}
      </div>

      {/* Iframe Viewport */}
      <div className="relative flex-1 min-h-[480px] h-[580px] bg-white overflow-hidden">
        {!sessionId ? (
          <div className="absolute inset-0 bg-[#030712] flex flex-col items-center justify-center p-6 text-center text-slate-400 font-mono">
            <div className="w-12 h-12 rounded-xl bg-[#0F172A] border border-[#1E293B] flex items-center justify-center mb-3">
              <Globe className="w-6 h-6 text-emerald-400/60" />
            </div>
            <h3 className="text-sm font-bold text-slate-200 mb-1">Live Survey Screen Inactive</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Start an automated survey run or inspect a URL to view the live answering screen in this window.
            </p>
          </div>
        ) : (
          <>
            {!iframeLoaded && (
              <div className="absolute inset-0 bg-[#030712]/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-slate-300 font-mono text-xs">
                <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mb-2" />
                <span>Rendering survey screen with auto-selected answers...</span>
              </div>
            )}
            <iframe
              key={`${screenUrl}_${zoomLevel}`}
              src={screenUrl}
              title={`Survey Screen Page ${currentPageIndex}`}
              onLoad={() => setIframeLoaded(true)}
              className="w-full h-full border-none transition-transform origin-top-left"
              style={{
                transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
                width: zoomLevel !== 100 ? `${10000 / zoomLevel}%` : '100%',
                height: zoomLevel !== 100 ? `${10000 / zoomLevel}%` : '100%',
              }}
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
          </>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="px-3.5 py-1.5 bg-[#080D1A] border-t border-[#1E293B] flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>
            {session?.status === 'delaying'
              ? 'Answering in progress &bull; Live DOM highlighted'
              : session?.status === 'completed'
              ? 'Survey completed'
              : 'Survey runner active'}
          </span>
        </div>
        <div className="text-slate-500">
          Page {currentPageIndex} of {Math.max(currentPageIndex, session?.totalEstimatedPages || 1)}
        </div>
      </div>
    </div>
  );
};
