import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Sliders, Globe, ArrowRight, Eye, Sparkles, Zap } from 'lucide-react';
import { SessionStatus, SimulationConfig } from '../types';
import { PLATFORMS, detectPlatform, Platform } from '../utils/platformDetector';

interface UrlInputBarProps {
  url: string;
  setUrl: (url: string) => void;
  status: SessionStatus;
  config: SimulationConfig;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onInspect: () => void;
  isInspecting: boolean;
  toggleSettings: () => void;
  showSettings: boolean;
}

// Static Tailwind class map — dynamic class names are purged at build time
const PLATFORM_STYLES: Record<string, {
  active: string;
  inactive: string;
  badge: string;
}> = {
  confirmit: {
    active: 'bg-blue-950/60 border-blue-500 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.25)]',
    inactive: 'bg-[#030712] border-[#1E293B] text-slate-400 hover:text-blue-300 hover:border-blue-800/70',
    badge: 'bg-blue-950/70 border-blue-500/70 text-blue-300',
  },
  decipher: {
    active: 'bg-orange-950/60 border-orange-500 text-orange-300 shadow-[0_0_8px_rgba(249,115,22,0.25)]',
    inactive: 'bg-[#030712] border-[#1E293B] text-slate-400 hover:text-orange-300 hover:border-orange-800/70',
    badge: 'bg-orange-950/70 border-orange-500/70 text-orange-300',
  },
  qualtrics: {
    active: 'bg-sky-950/60 border-sky-500 text-sky-300 shadow-[0_0_8px_rgba(14,165,233,0.25)]',
    inactive: 'bg-[#030712] border-[#1E293B] text-slate-400 hover:text-sky-300 hover:border-sky-800/70',
    badge: 'bg-sky-950/70 border-sky-500/70 text-sky-300',
  },
  unicom: {
    active: 'bg-violet-950/60 border-violet-500 text-violet-300 shadow-[0_0_8px_rgba(139,92,246,0.25)]',
    inactive: 'bg-[#030712] border-[#1E293B] text-slate-400 hover:text-violet-300 hover:border-violet-800/70',
    badge: 'bg-violet-950/70 border-violet-500/70 text-violet-300',
  },
  cmix: {
    active: 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.25)]',
    inactive: 'bg-[#030712] border-[#1E293B] text-slate-400 hover:text-rose-300 hover:border-rose-800/70',
    badge: 'bg-rose-950/70 border-rose-500/70 text-rose-300',
  },
  'google-sheets': {
    active: 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)]',
    inactive: 'bg-[#030712] border-[#1E293B] text-slate-400 hover:text-emerald-300 hover:border-emerald-800/70',
    badge: 'bg-emerald-950/70 border-emerald-500/70 text-emerald-300',
  },
  others: {
    active: 'bg-slate-800/60 border-slate-500 text-slate-200 shadow-[0_0_8px_rgba(100,116,139,0.2)]',
    inactive: 'bg-[#030712] border-[#1E293B] text-slate-400 hover:text-slate-200 hover:border-slate-600',
    badge: 'bg-slate-800/70 border-slate-500/70 text-slate-300',
  },
};

function getStyles(id: string) {
  return PLATFORM_STYLES[id] ?? PLATFORM_STYLES.others;
}

export const UrlInputBar: React.FC<UrlInputBarProps> = ({
  url,
  setUrl,
  status,
  config,
  onStart,
  onPause,
  onResume,
  onStop,
  onInspect,
  isInspecting,
  toggleSettings,
  showSettings,
}) => {
  const [activePlatformId, setActivePlatformId] = useState<string>('');
  const [detectedPlatform, setDetectedPlatform] = useState<Platform | null>(null);

  // Auto-detect platform whenever the URL changes
  useEffect(() => {
    if (!url.trim()) {
      setDetectedPlatform(null);
      return;
    }
    const p = detectPlatform(url);
    setDetectedPlatform(p);
  }, [url]);

  const isRunning = ['fetching', 'parsing', 'answering', 'delaying', 'submitting', 'advancing'].includes(status);
  const isPaused = status === 'paused';

  const handleSelectPlatform = (platform: Platform) => {
    setActivePlatformId(platform.id);
    setUrl(platform.demoUrl);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setActivePlatformId('');
      }
    } catch {
      // clipboard permission denied or not supported
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    setActivePlatformId('');
  };

  // If the current URL matches a platform's demoUrl exactly, highlight that button
  const activeButtonId = activePlatformId ||
    (PLATFORMS.find(p => p.demoUrl === url)?.id ?? '');

  return (
    <div className="bg-[#111827] rounded-xl border border-[#1E293B] shadow-2xl p-4 sm:p-5">
      <div className="flex flex-col gap-3">

        {/* Platform preset buttons row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">
              Platform:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((platform) => {
                const isActive = activeButtonId === platform.id;
                const styles = getStyles(platform.id);
                return (
                  <button
                    key={platform.id}
                    onClick={() => handleSelectPlatform(platform)}
                    disabled={isRunning}
                    title={platform.description}
                    className={`text-xs px-2.5 py-1 rounded-md font-mono border transition-all disabled:opacity-50 ${
                      isActive ? styles.active : styles.inactive
                    }`}
                  >
                    {platform.shortName}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={toggleSettings}
            className={`inline-flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg border transition-colors ${
              showSettings
                ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
                : 'bg-[#030712] border-[#1E293B] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span className="uppercase tracking-wider">Heuristic Parameters</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
          </button>
        </div>

        {/* URL input + action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Globe className="w-4 h-4 text-emerald-500/80" />
            </div>
            <input
              type="text"
              value={url}
              onChange={handleUrlChange}
              placeholder="Paste any survey URL or select a platform above..."
              disabled={isRunning}
              className="w-full pl-10 pr-16 py-2.5 bg-[#030712] border border-[#334155] rounded-lg text-sm font-mono text-emerald-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all disabled:opacity-60"
            />
            <button
              onClick={handlePaste}
              type="button"
              disabled={isRunning}
              className="absolute inset-y-1.5 right-2 px-2.5 text-xs font-mono text-slate-400 hover:text-slate-200 bg-[#111827] border border-[#334155] rounded-md hover:bg-[#1E293B] transition-colors disabled:opacity-40"
            >
              PASTE
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isRunning && !isPaused ? (
              <>
                <button
                  onClick={onInspect}
                  disabled={!url.trim() || isInspecting}
                  title="Inspect and extract questions from URL without running submission"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider text-slate-300 bg-[#030712] hover:bg-[#1E293B] border border-[#1E293B] transition-colors disabled:opacity-40"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>Inspect</span>
                </button>

                <button
                  onClick={onStart}
                  disabled={!url.trim()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Initiate Automation Sequence</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </>
            ) : (
              <>
                {isPaused ? (
                  <button
                    onClick={onResume}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-500 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Resume</span>
                  </button>
                ) : (
                  <button
                    onClick={onPause}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/40 transition-colors"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                )}

                <button
                  onClick={onStop}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-rose-300 bg-rose-950/40 border border-rose-800/60 hover:bg-rose-900/40 transition-colors"
                >
                  <Square className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                  <span>Abort</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Auto-detected platform badge */}
        {detectedPlatform && url.trim() && !url.includes('/api/mock-surveys/') && (
          <div className={`flex items-center gap-2 text-[11px] font-mono px-3 py-1.5 rounded-lg border w-fit ${getStyles(detectedPlatform.id).badge}`}>
            <Zap className="w-3 h-3 flex-shrink-0" />
            <span className="font-bold uppercase tracking-wider">{detectedPlatform.name}</span>
            <span className="text-slate-400">detected — {detectedPlatform.description}</span>
          </div>
        )}
      </div>
    </div>
  );
};
