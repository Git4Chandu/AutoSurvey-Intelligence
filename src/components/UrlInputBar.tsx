import React, { useState } from 'react';
import { Play, Pause, Square, Sliders, Globe, ArrowRight, Eye, Sparkles } from 'lucide-react';
import { SessionStatus, SimulationConfig } from '../types';

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

const SAMPLE_SURVEYS = [
  {
    name: 'Confirmit Live: Test Survey (Live US Confirmit)',
    url: 'https://survey.us.confirmit.com/wix/p114031942854.aspx?mode=test',
    desc: 'Live Confirmit survey with Hidden in Live testing mode, Info screens, and dynamic state selection.'
  },
  {
    name: 'Confirmit Flow: Hidden & Info Simulation (4 Steps)',
    url: '/api/mock-surveys/confirmit-simulation',
    desc: 'Simulates Confirmit testing bypass, error detection & recovery, and informational screens.'
  },
  {
    name: 'Demo 1: Developer Tools & AI Productivity (3 Pages)',
    url: '/api/mock-surveys/developer-tools',
    desc: 'Multi-step survey with radio scales, checkboxes, selects, and textareas.'
  },
  {
    name: 'Demo 2: Customer Experience & Quality (2 Pages)',
    url: '/api/mock-surveys/customer-feedback',
    desc: 'NPS rating, multiple-choice questions, and open-ended feedback.'
  },
  {
    name: 'Redirect Demo: Healthcare Survey (Redirects to Partner Survey)',
    url: '/api/mock-surveys/partner-redirect',
    desc: 'Demonstrates automated redirection detection, saving previous results & last screen snapshot in a separate window.'
  }
];

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
  const [selectedSample, setSelectedSample] = useState<string>('');

  const isRunning = ['fetching', 'parsing', 'answering', 'delaying', 'submitting', 'advancing'].includes(status);
  const isPaused = status === 'paused';

  const handleSelectSample = (sampleUrl: string) => {
    setSelectedSample(sampleUrl);
    if (sampleUrl) {
      setUrl(sampleUrl);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setSelectedSample('');
      }
    } catch {
      // clipboard permission denied or not supported in iframe
    }
  };

  return (
    <div className="bg-[#111827] rounded-xl border border-[#1E293B] shadow-2xl p-4 sm:p-5">
      <div className="flex flex-col gap-3">
        {/* Sample preset selector */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              Target Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_SURVEYS.map((s, idx) => (
                <button
                  key={s.url}
                  onClick={() => handleSelectSample(s.url)}
                  disabled={isRunning}
                  className={`text-xs px-2.5 py-1 rounded-md font-mono transition-all ${
                    url === s.url
                      ? 'bg-emerald-950/60 border border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                      : 'bg-[#030712] border border-[#1E293B] text-slate-400 hover:text-slate-200 hover:border-[#334155]'
                  } disabled:opacity-50`}
                >
                  Demo {idx + 1}: {s.name.split(':')[1]?.split('(')[0]?.trim()}
                </button>
              ))}
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

        {/* Input Bar and Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Globe className="w-4 h-4 text-emerald-500/80" />
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setSelectedSample('');
              }}
              placeholder="Paste any survey URL (e.g. https://... or select Demo 1 above)..."
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

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-2">
            {!isRunning && !isPaused ? (
              <>
                {status === 'error' && (
                  <button
                    onClick={onResume}
                    title="Resume test from current survey page"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-500 shadow-md transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Resume Test</span>
                  </button>
                )}

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
      </div>
    </div>
  );
};
