import React, { useState } from 'react';
import { SurveyPage, QuestionAnswer, PageHistoryEntry, ActiveDelayInfo } from '../types';
import {
  CheckCircle2,
  Sparkles,
  Clock,
  HelpCircle,
  Layers,
  CheckSquare,
  ListOrdered,
  Type,
  AlertCircle,
  Info,
  CircleDot,
  AlignLeft,
  Hash,
  Star,
  Sliders,
  ChevronDown,
  ChevronUp,
  Check,
  Monitor,
  MessageSquare,
} from 'lucide-react';

interface QuestionsViewProps {
  currentPageData: SurveyPage | null;
  currentAnswers: QuestionAnswer[];
  history: PageHistoryEntry[];
  activeDelay?: ActiveDelayInfo;
  isCompleted?: boolean;
  onViewStageScreen?: (pageIndex: number) => void;
}

export const QuestionsView: React.FC<QuestionsViewProps> = ({
  currentPageData,
  currentAnswers,
  history,
  activeDelay,
  isCompleted,
  onViewStageScreen,
}) => {
  const [collapsedStages, setCollapsedStages] = useState<Record<number, boolean>>({});

  const toggleStageCollapse = (pageIndex: number) => {
    setCollapsedStages((prev) => ({
      ...prev,
      [pageIndex]: !prev[pageIndex],
    }));
  };

  const renderQuestionTypeBadge = (type?: string) => {
    switch (type) {
      case 'checkbox':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-950/70 border border-purple-500/50 text-purple-300 font-mono text-[10px] font-bold uppercase tracking-wider">
            <CheckSquare className="w-3 h-3 text-purple-400" />
            <span>Multiple Choice (Checkbox)</span>
          </span>
        );
      case 'select':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-950/70 border border-blue-500/50 text-blue-300 font-mono text-[10px] font-bold uppercase tracking-wider">
            <ChevronDown className="w-3 h-3 text-blue-400" />
            <span>Dropdown (Select)</span>
          </span>
        );
      case 'textarea':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 font-mono text-[10px] font-bold uppercase tracking-wider">
            <AlignLeft className="w-3 h-3 text-emerald-400" />
            <span>Open Response (Textarea)</span>
          </span>
        );
      case 'text':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950/70 border border-amber-500/50 text-amber-300 font-mono text-[10px] font-bold uppercase tracking-wider">
            <Type className="w-3 h-3 text-amber-400" />
            <span>Short Text Input</span>
          </span>
        );
      case 'number':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-orange-950/70 border border-orange-500/50 text-orange-300 font-mono text-[10px] font-bold uppercase tracking-wider">
            <Hash className="w-3 h-3 text-orange-400" />
            <span>Numeric Input</span>
          </span>
        );
      case 'rating':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-yellow-950/70 border border-yellow-500/50 text-yellow-300 font-mono text-[10px] font-bold uppercase tracking-wider">
            <Star className="w-3 h-3 text-yellow-400" />
            <span>Rating Scale</span>
          </span>
        );
      case 'scale':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-950/70 border border-teal-500/50 text-teal-300 font-mono text-[10px] font-bold uppercase tracking-wider">
            <Sliders className="w-3 h-3 text-teal-400" />
            <span>Scale Matrix</span>
          </span>
        );
      case 'info':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-950/70 border border-sky-500/50 text-sky-300 font-mono text-[10px] font-bold uppercase tracking-wider">
            <Info className="w-3 h-3 text-sky-400" />
            <span>Informational</span>
          </span>
        );
      case 'radio':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/50 text-cyan-300 font-mono text-[10px] font-bold uppercase tracking-wider">
            <CircleDot className="w-3 h-3 text-cyan-400" />
            <span>Single Choice (Radio)</span>
          </span>
        );
    }
  };
  if (!currentPageData && history.length === 0) {
    return (
      <div className="bg-[#111827] rounded-xl border border-[#1E293B] p-8 text-center shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-[#030712] border border-[#1E293B] text-emerald-400 flex items-center justify-center mx-auto mb-3">
          <HelpCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-200 uppercase font-mono tracking-wider">No Target Form Loaded</h3>
        <p className="text-xs font-mono text-slate-500 max-w-md mx-auto mt-1">
          Input a survey URL or select a preset target above, then click &ldquo;Initiate Automation Sequence&rdquo; to begin DOM analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Page Section */}
      {currentPageData && (
        <div className="bg-[#111827] rounded-xl border border-[#1E293B] shadow-2xl overflow-hidden">
          {/* Page header banner */}
          <div className="p-5 border-b border-[#1E293B] bg-[#0F172A] flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-950/50 border border-emerald-500/50 text-emerald-300">
                  PAGE {currentPageData.pageIndex} OF {Math.max(currentPageData.pageIndex, currentPageData.totalEstimatedPages)}
                </span>
                {currentPageData.isHiddenPage && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-950/60 border border-amber-800 text-amber-300 uppercase">
                    HIDDEN / TEST MODE
                  </span>
                )}
                {currentPageData.isInfoOnlyPage && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-950/60 border border-blue-800 text-blue-300 uppercase">
                    INFO SCREEN
                  </span>
                )}
                {currentPageData.isFinalPage && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-purple-950/50 border border-purple-800 text-purple-300 uppercase">
                    TERMINAL STEP
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-100 font-sans">{currentPageData.title}</h3>
              {currentPageData.description && (
                <p className="text-xs font-mono text-slate-400 mt-0.5">{currentPageData.description}</p>
              )}
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono">Page Progress</span>
              <span className="text-sm font-mono font-bold text-emerald-400">
                {currentAnswers.length} / {currentPageData.questions.length} EVALUATED
              </span>
            </div>
          </div>

          {/* Validation Error Banner if present */}
          {currentPageData.hasValidationErrors && (
            <div className="mx-5 mt-4 p-3.5 bg-rose-950/40 border border-rose-500/50 rounded-lg text-rose-300 text-xs font-mono flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Validation Error Encountered on Target Page:</span>
                <ul className="list-disc list-inside mt-1 text-rose-200">
                  {(currentPageData.validationErrors || ['Please select an answer to move forward']).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
                <p className="mt-1 text-slate-300 text-[11px]">
                  Intelligence active: Formulating required answer to satisfy validation constraint and advance.
                </p>
              </div>
            </div>
          )}

          {/* Info Only Notice */}
          {(currentPageData.isInfoOnlyPage || currentPageData.questions.length === 0 || currentPageData.questions.every(q => q.isInfoOnly)) && (
            <div className="mx-5 mt-4 p-3.5 bg-blue-950/30 border border-blue-600/40 rounded-lg text-blue-200 text-xs font-mono flex items-center gap-2.5">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>
                Informational / Consent Screen: No user inputs required. The runner will auto-submit after human reading delay.
              </span>
            </div>
          )}

          {/* List of questions */}
          <div className="divide-y divide-[#1E293B] p-5 space-y-5">
            {currentPageData.questions.map((question, qIdx) => {
              const answer = currentAnswers.find((a) => a.questionId === question.id);
              const isCurrentlyActive =
                activeDelay?.questionId === question.id ||
                activeDelay?.questionTitle === question.title;

              return (
                <div
                  key={question.id}
                  className={`pt-5 first:pt-0 transition-all ${
                    isCurrentlyActive
                      ? 'ring-2 ring-emerald-500 rounded-xl p-4 bg-emerald-950/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                      : ''
                  }`}
                >
                  {/* Active In-Progress Indicator Banner on this question */}
                  {isCurrentlyActive && (
                    <div className="mb-3 px-3 py-1.5 rounded-lg bg-emerald-900/60 border border-emerald-400/60 flex items-center justify-between text-xs font-mono text-emerald-200">
                      <div className="flex items-center gap-2 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>ACTIVE QUESTION IN PROGRESS</span>
                      </div>
                      <span className="text-[11px] text-emerald-300">
                        Phase: {activeDelay?.phase.toUpperCase()} &bull; Timing Delay Active
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-[#030712] border border-[#1E293B] text-emerald-400 font-mono font-bold text-xs flex items-center justify-center mt-0.5">
                        {qIdx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        {/* Question ID and Meta Badges */}
                        <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
                          <span className="px-2 py-0.5 rounded bg-[#030712] border border-emerald-500/50 text-emerald-300 font-mono font-bold text-[11px]">
                            ID: {question.id}
                          </span>
                          {question.inputName && question.inputName !== question.id && (
                            <span className="px-1.5 py-0.5 rounded bg-[#080D1A] border border-[#1E293B] text-slate-400 font-mono text-[10px]">
                              field: {question.inputName}
                            </span>
                          )}
                          {renderQuestionTypeBadge(question.type)}
                          {question.required ? (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/60 text-rose-300 uppercase tracking-wider">
                              Required *
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#030712] border border-[#1E293B] text-slate-500 uppercase tracking-wider">
                              Optional
                            </span>
                          )}
                          {question.isInfoOnly && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800 text-blue-300 uppercase tracking-wider">
                              INFO
                            </span>
                          )}
                          {question.isHiddenForLive && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800 text-amber-300 uppercase tracking-wider">
                              HIDDEN FOR LIVE
                            </span>
                          )}
                        </div>

                        {/* Question Title / Prompt */}
                        <h4 className="text-sm font-semibold text-slate-100 leading-snug">
                          {question.title || question.text}
                          {question.required && (
                            <span className="text-rose-400 ml-1 font-mono font-bold">*</span>
                          )}
                        </h4>
                        {question.description && (
                          <p className="text-xs font-mono text-slate-400 mt-0.5">{question.description}</p>
                        )}
                        {question.instruction && (
                          <div className="mt-1.5 px-2.5 py-1 rounded bg-purple-950/40 border border-purple-800/40 text-purple-200 font-mono text-xs flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span>Requirement Constraint: {question.instruction}</span>
                          </div>
                        )}
                        {question.errorMessage && (
                          <p className="text-xs font-mono text-rose-400 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {question.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Render options or text response */}
                  <div className="ml-8.5 pl-0 sm:pl-1 space-y-2">
                    {/* If radio/select/checkbox options exist */}
                    {question.options && question.options.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {question.options.map((opt) => {
                          const isSelected =
                            answer?.selectedValues?.includes(opt.value) ||
                            answer?.selectedValues?.includes(opt.label);
                          return (
                            <div
                              key={opt.id || opt.value}
                              className={`text-xs p-2.5 rounded-lg border font-mono flex items-center gap-2.5 transition-all ${
                                isSelected
                                  ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200 font-medium shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                                  : 'bg-[#030712] border-[#1E293B] text-slate-400'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                                  isSelected
                                    ? 'border-emerald-400 bg-emerald-500 text-[#0A0A0B]'
                                    : 'border-[#334155] bg-[#111827]'
                                }`}
                              >
                                {isSelected && <CheckCircle2 className="w-3 h-3 text-slate-950 stroke-[3]" />}
                              </div>
                              <span className="line-clamp-2">{opt.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Text or Textarea */
                      <div className="mt-2">
                        <div
                          className={`text-xs font-mono p-3 rounded-lg border ${
                            answer
                              ? 'bg-[#030712] border-emerald-500/60 text-emerald-200'
                              : 'bg-[#030712] border-dashed border-[#1E293B] text-slate-600'
                          }`}
                        >
                          {answer?.textResponse ||
                            answer?.selectedValues[0] ||
                            'Awaiting neural formulation...'}
                        </div>
                      </div>
                    )}

                    {/* Auto-Answered Result Card */}
                    {answer && (
                      <div className="mt-3 bg-[#030712] border border-emerald-500/50 rounded-lg p-3.5 text-xs font-mono shadow-md">
                        {/* Header banner */}
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1E293B]">
                          <div className="flex items-center gap-2 text-emerald-300 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>AUTO-ANSWER RESULT:</span>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-bold">
                            Value: {answer.textResponse || answer.selectedValues.join(', ') || 'Submitted'}
                          </span>
                        </div>

                        <div className="flex items-start gap-2 text-slate-300">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-emerald-400">Gemini Neural Reasoning: </span>
                            <span className="text-slate-300">{answer.reasoning}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-[#1E293B]">
                          <span className="flex items-center gap-1 font-mono text-slate-400">
                            <Clock className="w-3 h-3 text-slate-500" />
                            Reading: {(answer.delayBreakdown.readingMs / 1000).toFixed(1)}s
                          </span>
                          <span>•</span>
                          <span className="font-mono text-slate-400">
                            Hesitation: {(answer.delayBreakdown.thinkingMs / 1000).toFixed(1)}s
                          </span>
                          {answer.delayBreakdown.typingMs > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-slate-400">
                                Keystrokes: {(answer.delayBreakdown.typingMs / 1000).toFixed(1)}s
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History of Completed Steps */}
      {history.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Executed Page Stages ({history.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Completed Steps & Full Response Audit
            </span>
          </div>

          <div className="space-y-4">
            {history.map((h) => {
              const isCollapsed = !!collapsedStages[h.pageIndex];
              const hesitationSec = (h.pageDelayMs / 1000).toFixed(1);
              const durationSec = h.pageDurationMs
                ? (h.pageDurationMs / 1000).toFixed(1)
                : hesitationSec;

              return (
                <div
                  key={h.pageIndex}
                  className="bg-[#111827] rounded-xl border border-[#1E293B] shadow-xl overflow-hidden transition-all"
                >
                  {/* Stage Header Banner */}
                  <div className="p-4 bg-[#0F172A] border-b border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-md bg-emerald-950/80 border border-emerald-500 text-emerald-300 flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 shadow-sm">
                        ✓
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/50 text-emerald-300">
                            STAGE {h.pageIndex} EXECUTED
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(h.submittedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-100 font-sans">
                          {h.pageTitle}
                        </h4>
                        {h.url && (
                          <div className="text-[10px] font-mono text-slate-500 truncate max-w-md mt-0.5">
                            {h.url}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#030712] border border-[#1E293B] text-emerald-400 font-bold">
                        {h.answers.length} {h.answers.length === 1 ? 'Question' : 'Questions'}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-1 rounded bg-[#030712] border border-[#1E293B] text-slate-400">
                        {durationSec}s duration
                      </span>

                      {onViewStageScreen && (
                        <button
                          onClick={() => onViewStageScreen(h.pageIndex)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-slate-200 text-xs font-mono font-semibold transition-colors cursor-pointer"
                          title="Inspect rendered DOM screenshot for this stage"
                        >
                          <Monitor className="w-3 h-3 text-emerald-400" />
                          <span className="hidden md:inline">Inspect Screen</span>
                        </button>
                      )}

                      <button
                        onClick={() => toggleStageCollapse(h.pageIndex)}
                        className="p-1.5 rounded bg-[#1E293B] hover:bg-[#334155] text-slate-300 transition-colors"
                        title={isCollapsed ? 'Expand Question Details' : 'Collapse Question Details'}
                      >
                        {isCollapsed ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronUp className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Stage Question Details (Expanded View) */}
                  {!isCollapsed && (
                    <div className="p-4 space-y-4">
                      {h.answers.length === 0 ? (
                        <div className="text-xs font-mono text-slate-500 italic py-2 text-center">
                          Informational or transitional screen executed without input fields.
                        </div>
                      ) : (
                        h.answers.map((ans, idx) => (
                          <div
                            key={ans.questionId || idx}
                            className="bg-[#0B101D] rounded-lg border border-[#1E293B] p-4 space-y-3 shadow-inner"
                          >
                            {/* Question Header: ID, Field, Type, and Duration */}
                            <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-[#1E293B]/70">
                              <div className="flex items-center flex-wrap gap-1.5">
                                <span className="w-5 h-5 rounded bg-[#030712] border border-[#1E293B] text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-[#030712] border border-emerald-500/50 text-emerald-300 font-mono font-bold text-[11px]">
                                  ID: {ans.questionId}
                                </span>
                                {ans.inputName && ans.inputName !== ans.questionId && (
                                  <span className="px-1.5 py-0.5 rounded bg-[#080D1A] border border-[#1E293B] text-slate-400 font-mono text-[10px]">
                                    field: {ans.inputName}
                                  </span>
                                )}
                                {renderQuestionTypeBadge(ans.questionType)}
                              </div>

                              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#030712] border border-[#1E293B] text-slate-400">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>
                                    {((ans.delayBreakdown?.totalMs || 1000) / 1000).toFixed(1)}s
                                  </span>
                                </span>
                              </div>
                            </div>

                            {/* Question Details: Title/Text Prompt & Instructions */}
                            <div className="space-y-1">
                              <div className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
                                Question Prompt & Text:
                              </div>
                              <h5 className="text-sm font-semibold text-slate-100 leading-snug">
                                {ans.questionTitle}
                              </h5>
                              {ans.questionDescription && (
                                <p className="text-xs font-mono text-slate-400 mt-1 leading-relaxed">
                                  {ans.questionDescription}
                                </p>
                              )}
                            </div>

                            {/* Optional: Options Summary */}
                            {ans.optionsSummary && ans.optionsSummary.length > 0 && (
                              <div className="pt-0.5">
                                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
                                  Available Choices in Form:
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {ans.optionsSummary.map((opt, oIdx) => {
                                    const isChosen =
                                      ans.selectedValues?.includes(opt) ||
                                      ans.textResponse === opt;
                                    return (
                                      <span
                                        key={oIdx}
                                        className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                                          isChosen
                                            ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                                            : 'bg-[#030712] border-[#1E293B] text-slate-400'
                                        }`}
                                      >
                                        {isChosen ? '✓ ' : ''}
                                        {opt}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Submitted Answer Block */}
                            <div className="p-3 bg-[#030712] rounded-lg border border-emerald-500/30 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Submitted Answer / Selected Values</span>
                                </span>
                                {ans.selectedValues && ans.selectedValues.length > 0 && (
                                  <span className="text-[10px] font-mono text-slate-500">
                                    {ans.selectedValues.length}{' '}
                                    {ans.selectedValues.length === 1 ? 'selection' : 'selections'}
                                  </span>
                                )}
                              </div>

                              {/* Selected Values Pills */}
                              {ans.selectedValues && ans.selectedValues.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                  {ans.selectedValues.map((val, vIdx) => (
                                    <span
                                      key={vIdx}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-500/80 text-emerald-200 font-mono text-xs font-semibold shadow-sm"
                                    >
                                      <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                                      <span>{val}</span>
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Text Response in Quote Box */}
                              {ans.textResponse && (
                                <div className="p-2.5 rounded bg-[#070B14] border border-[#1E293B] text-emerald-300 font-mono text-xs leading-relaxed flex items-start gap-2">
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                  <span className="italic">&ldquo;{ans.textResponse}&rdquo;</span>
                                </div>
                              )}

                              {/* Default fallback */}
                              {(!ans.selectedValues || ans.selectedValues.length === 0) &&
                                !ans.textResponse && (
                                  <span className="text-slate-500 italic text-xs font-mono">
                                    Verified & advanced without explicit textual input
                                  </span>
                                )}
                            </div>

                            {/* Reasoning & Delay Metrics Footer */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#1E293B]/60 text-xs font-mono text-slate-400">
                              <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                <span className="truncate">
                                  <strong className="text-slate-300">Rationale:</strong>{' '}
                                  {ans.reasoning}
                                </span>
                              </div>
                              {ans.delayBreakdown && (
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-shrink-0">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  <span>
                                    Reading: {(ans.delayBreakdown.readingMs / 1000).toFixed(1)}s
                                  </span>
                                  <span>&bull;</span>
                                  <span>
                                    Hesitation: {(ans.delayBreakdown.thinkingMs / 1000).toFixed(1)}s
                                  </span>
                                  {ans.delayBreakdown.typingMs > 0 && (
                                    <>
                                      <span>&bull;</span>
                                      <span>
                                        Typing: {(ans.delayBreakdown.typingMs / 1000).toFixed(1)}s
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
