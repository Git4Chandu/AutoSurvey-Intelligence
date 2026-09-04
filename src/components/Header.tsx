import React from 'react';
import { Bot, Sparkles, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { SessionStatus } from '../types';

interface HeaderProps {
  status: SessionStatus;
  totalQuestionsAnswered: number;
  totalSimulatedDelayMs: number;
  currentPageIndex: number;
  totalEstimatedPages: number;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  totalQuestionsAnswered,
  totalSimulatedDelayMs,
  currentPageIndex,
  totalEstimatedPages,
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'idle':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-[#030712] text-slate-300 border border-[#1E293B]">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
            ENGINE READY
          </span>
        );
      case 'fetching':
      case 'parsing':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-[#030712] text-blue-400 border border-blue-900/50">
            <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
            ANALYZING DOM
          </span>
        );
      case 'answering':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-[#030712] text-emerald-400 border border-emerald-900/50">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
            GEMINI REASONING
          </span>
        );
      case 'delaying':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-[#030712] text-amber-400 border border-amber-900/50">
            <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
            HUMAN DELAY JITTER
          </span>
        );
      case 'submitting':
      case 'advancing':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-[#030712] text-purple-400 border border-purple-900/50">
            <RefreshCw className="w-3 h-3 animate-spin text-purple-400" />
            AUTO-ADVANCING
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            MISSION COMPLETE
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-[#030712] text-amber-400 border border-amber-900/50">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            PAUSED
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-[#030712] text-rose-400 border border-rose-900/50">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            EXCEPTION HALT
          </span>
        );
    }
  };

  return (
    <header className="bg-[#0F172A] border-b border-[#1E293B] sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
            <Bot className="w-5 h-5 text-[#0A0A0B]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white uppercase font-sans">
                AUTOSURVEY<span className="text-emerald-400 font-normal">INTELLIGENCE</span>
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 uppercase tracking-wider">
                CORE ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Autonomous survey engine with heuristic delays & Gemini neural reasoning
            </p>
          </div>
        </div>

        {/* Live Telemetry Metrics Header */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {getStatusBadge()}

          <div className="h-6 w-[1px] bg-[#1E293B] hidden sm:block"></div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#030712] border border-[#1E293B] text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Page:</span>
            <span className="font-mono font-bold text-slate-200">
              {currentPageIndex} / {Math.max(currentPageIndex, totalEstimatedPages)}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#030712] border border-[#1E293B] text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Answered:</span>
            <span className="font-mono font-bold text-emerald-400">{totalQuestionsAnswered}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#030712] border border-[#1E293B] text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono font-bold text-amber-400">
              {(totalSimulatedDelayMs / 1000).toFixed(1)}s
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
