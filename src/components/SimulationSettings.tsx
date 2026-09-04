import React from 'react';
import { SimulationConfig, PersonaType, DelayProfile } from '../types';
import { User, Clock, Zap, BookOpen, Keyboard, ShieldCheck } from 'lucide-react';

interface SimulationSettingsProps {
  config: SimulationConfig;
  onChange: (updated: SimulationConfig) => void;
  disabled?: boolean;
}

const PERSONA_OPTIONS: Array<{ id: PersonaType; title: string; desc: string }> = [
  {
    id: 'tech_pro',
    title: 'Tech Professional',
    desc: 'Software engineer / architect, values high performance, privacy, clean UX, and automation tools.'
  },
  {
    id: 'general_consumer',
    title: 'Everyday Consumer',
    desc: 'Balanced digital user, looks for ease of use, transparent pricing, and helpful support.'
  },
  {
    id: 'thoughtful_evaluator',
    title: 'Thoughtful Evaluator',
    desc: 'Analytical and measured, provides realistic ratings with constructive, detailed critiques.'
  },
  {
    id: 'enthusiastic_user',
    title: 'Enthusiastic Adopter',
    desc: 'Passionate and positive, excited about new software features, and provides encouraging feedback.'
  },
  {
    id: 'student_researcher',
    title: 'Student Researcher',
    desc: 'Academic perspective, values collaborative workflows, free tiers, and educational discounts.'
  },
  {
    id: 'custom',
    title: 'Custom Persona',
    desc: 'Specify your own custom prompt profile and context background.'
  }
];

const DELAY_PRESETS: Array<{ id: DelayProfile; label: string; min: number; max: number; note: string }> = [
  { id: 'realistic', label: 'Realistic Human (Recommended)', min: 1.8, max: 4.5, note: 'Normal human reading, thinking, and typing pace' },
  { id: 'cautious', label: 'Cautious & Deliberate', min: 3.5, max: 7.5, note: 'Slower decision-making, extended reading time' },
  { id: 'fast', label: 'Fast Simulation', min: 0.8, max: 2.0, note: 'Accelerated delays for rapid verification' },
  { id: 'custom', label: 'Custom Delays', min: 1.0, max: 5.0, note: 'Manually adjust delay boundaries' }
];

export const SimulationSettings: React.FC<SimulationSettingsProps> = ({
  config,
  onChange,
  disabled = false,
}) => {
  const handlePersonaChange = (persona: PersonaType) => {
    onChange({ ...config, persona });
  };

  const handleDelayPresetChange = (preset: typeof DELAY_PRESETS[0]) => {
    onChange({
      ...config,
      delayProfile: preset.id,
      minDelaySec: preset.min,
      maxDelaySec: preset.max,
    });
  };

  return (
    <div className="bg-[#111827] rounded-xl border border-[#1E293B] p-5 mb-6 shadow-2xl">
      <div className="flex items-center justify-between border-b border-[#1E293B] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-400" />
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">
            Heuristic Parameters & Delay Configuration
          </h2>
        </div>
        <span className="text-xs font-mono text-emerald-400/80">
          Neural Variance: ACTIVE
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Human Persona */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">
            1. Respondent Persona Archetype
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PERSONA_OPTIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => handlePersonaChange(p.id)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  config.persona === p.id
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-100 ring-1 ring-emerald-500/30'
                    : 'bg-[#030712] border-[#1E293B] text-slate-400 hover:text-slate-200 hover:border-[#334155]'
                } disabled:opacity-50`}
              >
                <div className="text-xs font-mono font-bold flex items-center justify-between text-slate-200">
                  {p.title}
                  {config.persona === p.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]"></span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  {p.desc}
                </p>
              </button>
            ))}
          </div>

          {config.persona === 'custom' && (
            <div className="mt-3">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Custom Persona Prompt:
              </label>
              <textarea
                value={config.customPersonaPrompt || ''}
                onChange={(e) => onChange({ ...config, customPersonaPrompt: e.target.value })}
                disabled={disabled}
                placeholder="e.g. 42-year old healthcare professional with 15 years experience, skeptical about automated diagnostics..."
                rows={2}
                className="w-full text-xs font-mono p-2.5 bg-[#030712] border border-[#334155] rounded-lg text-emerald-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
          {/* Engine Answering Mode Selector */}
          <div className="mt-4 pt-3 border-t border-[#1E293B]">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Answer Engine Architecture
              </span>
              <span className="text-[10px] font-mono text-emerald-400 uppercase">
                {config.engineMode || 'hybrid'}
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...config, engineMode: 'hybrid' })}
                className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                  (config.engineMode || 'hybrid') === 'hybrid'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-100 ring-1 ring-emerald-500/30'
                    : 'bg-[#030712] border-[#1E293B] text-slate-400 hover:text-slate-200 hover:border-[#334155]'
                } disabled:opacity-50`}
              >
                <div className="font-mono font-bold text-slate-200 flex items-center justify-between">
                  Hybrid (AI + Deterministic)
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-mono">RECOMMENDED</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Gemini persona answers with automatic fallback to deterministic rule engine if quotas or errors occur.
                </p>
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...config, engineMode: 'deterministic' })}
                className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                  config.engineMode === 'deterministic'
                    ? 'bg-blue-950/40 border-blue-500 text-blue-100 ring-1 ring-blue-500/30'
                    : 'bg-[#030712] border-[#1E293B] text-slate-400 hover:text-slate-200 hover:border-[#334155]'
                } disabled:opacity-50`}
              >
                <div className="font-mono font-bold text-slate-200 flex items-center justify-between">
                  Deterministic Test Engine
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 font-mono">HIGH SPEED</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  100% reliable rule-based answers (Section 13) matching exact HTML controls without calling external AI APIs.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Random Delay Interval Logic */}
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                2. Random Delay Variance Interval
              </span>
              <span className="text-[11px] font-mono text-amber-400">
                {config.minDelaySec}s - {config.maxDelaySec}s
              </span>
            </label>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {DELAY_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleDelayPresetChange(preset)}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                    config.delayProfile === preset.id
                      ? 'bg-amber-950/40 border-amber-500/80 text-amber-100 ring-1 ring-amber-500/30'
                      : 'bg-[#030712] border-[#1E293B] text-slate-400 hover:text-slate-200 hover:border-[#334155]'
                  } disabled:opacity-50`}
                >
                  <div className="font-mono font-bold text-slate-200">{preset.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{preset.note}</div>
                </button>
              ))}
            </div>

            {/* Delay range sliders */}
            <div className="bg-[#030712] p-3 rounded-lg border border-[#1E293B] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono text-[11px]">Hesitation Jitter Window:</span>
                <span className="font-mono font-bold text-amber-400">
                  {config.minDelaySec.toFixed(1)}s to {config.maxDelaySec.toFixed(1)}s
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 mb-1 uppercase">Min Delay ({config.minDelaySec}s)</div>
                  <input
                    type="range"
                    min="0.5"
                    max="6.0"
                    step="0.5"
                    value={config.minDelaySec}
                    disabled={disabled}
                    onChange={(e) => {
                      const min = parseFloat(e.target.value);
                      onChange({
                        ...config,
                        minDelaySec: min,
                        maxDelaySec: Math.max(min + 0.5, config.maxDelaySec),
                        delayProfile: 'custom',
                      });
                    }}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-slate-500 mb-1 uppercase">Max Delay ({config.maxDelaySec}s)</div>
                  <input
                    type="range"
                    min="1.0"
                    max="12.0"
                    step="0.5"
                    value={config.maxDelaySec}
                    disabled={disabled}
                    onChange={(e) => {
                      const max = parseFloat(e.target.value);
                      onChange({
                        ...config,
                        maxDelaySec: max,
                        minDelaySec: Math.min(max - 0.5, config.minDelaySec),
                        delayProfile: 'custom',
                      });
                    }}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Additional human simulation toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="flex items-center justify-between p-2.5 bg-[#030712] border border-[#1E293B] rounded-lg cursor-pointer">
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-mono text-slate-300">WPM Reading Speed</span>
              </div>
              <input
                type="checkbox"
                checked={config.readingSpeedWpm > 0}
                onChange={(e) => onChange({ ...config, readingSpeedWpm: e.target.checked ? 230 : 0 })}
                disabled={disabled}
                className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 bg-[#030712] border border-[#1E293B] rounded-lg cursor-pointer">
              <div className="flex items-center gap-2">
                <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-mono text-slate-300">Keystroke Cadence</span>
              </div>
              <input
                type="checkbox"
                checked={config.simulateKeystrokes}
                onChange={(e) => onChange({ ...config, simulateKeystrokes: e.target.checked })}
                disabled={disabled}
                className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 bg-[#030712] border border-[#1E293B] rounded-lg cursor-pointer sm:col-span-2">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <div>
                  <span className="text-xs font-mono font-bold text-slate-200">Auto-Advance Multi-Page Engine</span>
                  <p className="text-[10px] text-slate-500">Automatically click Next/Submit to traverse all pages to finish</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.autoAdvance}
                onChange={(e) => onChange({ ...config, autoAdvance: e.target.checked })}
                disabled={disabled}
                className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
