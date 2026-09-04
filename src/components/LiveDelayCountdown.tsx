import React from 'react';
import { ActiveDelayInfo } from '../types';
import { Clock, BookOpen, Brain, Keyboard, ArrowRight } from 'lucide-react';

interface LiveDelayCountdownProps {
  activeDelay?: ActiveDelayInfo;
}

export const LiveDelayCountdown: React.FC<LiveDelayCountdownProps> = ({ activeDelay }) => {
  if (!activeDelay) return null;

  const { phase, durationMs, remainingMs, questionTitle, questionId, questionText, currentAnswerValue } = activeDelay;
  const progressPercent = Math.min(100, Math.max(0, ((durationMs - remainingMs) / durationMs) * 100));

  const displayTitle = questionText || questionTitle;

  const getPhaseIcon = () => {
    switch (phase) {
      case 'reading':
        return <BookOpen className="w-4 h-4 text-sky-600 animate-bounce" />;
      case 'thinking':
        return <Brain className="w-4 h-4 text-amber-600 animate-pulse" />;
      case 'typing':
        return <Keyboard className="w-4 h-4 text-indigo-600 animate-pulse" />;
      case 'page_transition':
        return <ArrowRight className="w-4 h-4 text-emerald-600 animate-pulse" />;
    }
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case 'reading':
        return 'Simulating Natural Reading Time';
      case 'thinking':
        return 'Simulating Human Hesitation & Decision Interval';
      case 'typing':
        return 'Simulating Human Keystroke Timing';
      case 'page_transition':
        return 'Reviewing Page Answers Before Submitting';
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'reading':
        return 'from-sky-500 to-blue-600';
      case 'thinking':
        return 'from-amber-500 to-orange-600';
      case 'typing':
        return 'from-indigo-500 to-purple-600';
      case 'page_transition':
        return 'from-emerald-500 to-teal-600';
    }
  };

  return (
    <div className="bg-[#111827] rounded-xl border border-amber-900/50 shadow-2xl p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#030712] border border-amber-800/50 flex items-center justify-center">
            {getPhaseIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono font-bold text-amber-300 flex items-center gap-2">
              <span className="uppercase tracking-wider">{getPhaseLabel()}</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            </div>
            
            {/* Prominent Question ID and Text In Progress */}
            {displayTitle && (
              <div className="flex items-center flex-wrap gap-2 mt-1">
                {questionId && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono font-bold text-[11px] shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    ID: {questionId}
                  </span>
                )}
                <span className="text-xs font-semibold text-slate-100 line-clamp-1 max-w-xl">
                  {displayTitle}
                </span>
              </div>
            )}

            {/* Current Answer Being Formulated */}
            {currentAnswerValue && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 mt-1">
                <span className="text-slate-400">Target Response:</span>
                <span className="bg-[#030712] px-2 py-0.5 rounded border border-emerald-800/60 font-medium text-emerald-300">
                  {currentAnswerValue}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Numeric countdown */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="text-right font-mono">
            <span className="text-base sm:text-lg font-bold text-amber-400">
              {(remainingMs / 1000).toFixed(1)}s
            </span>
            <span className="text-[11px] text-slate-500 font-mono ml-1">
              / {(durationMs / 1000).toFixed(1)}s
            </span>
          </div>
        </div>
      </div>

      {/* Animated progress track */}
      <div className="w-full bg-[#030712] border border-[#1E293B] rounded-full h-2 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${getPhaseColor()} transition-all duration-150 ease-out`}
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-1.5">
        <span>Simulating heuristic variance jitter (±25%)</span>
        <span className="text-emerald-400">{progressPercent.toFixed(0)}% elapsed</span>
      </div>
    </div>
  );
};
