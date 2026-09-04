export type QuestionType =
  | 'radio'
  | 'checkbox'
  | 'select'
  | 'text'
  | 'textarea'
  | 'scale'
  | 'number'
  | 'email'
  | 'rating'
  | 'info'
  | 'hidden';

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
}

export interface QuestionField {
  name: string;
  type: string;
  required: boolean;
  options?: QuestionOption[];
  defaultValue?: string;
  placeholder?: string;
}

export interface SurveyQuestion {
  id: string;
  title: string;
  description?: string;
  type: QuestionType;
  options?: QuestionOption[];
  fields?: QuestionField[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  required?: boolean;
  inputName?: string;
  placeholder?: string;
  isHiddenForLive?: boolean;
  isInfoOnly?: boolean;
  errorMessage?: string;
}

export interface SurveyPage {
  pageIndex: number;
  totalEstimatedPages: number;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  actionUrl: string;
  formMethod: 'GET' | 'POST';
  hiddenFields: Record<string, string>;
  submitButtonLabel: string;
  isFinalPage: boolean;
  isInfoOnlyPage?: boolean;
  isHiddenPage?: boolean;
  hasValidationErrors?: boolean;
  validationErrors?: string[];
  rawHtml?: string;
}

export interface QuestionAnswer {
  questionId: string;
  questionTitle: string;
  questionType: QuestionType;
  selectedValues: string[];
  textResponse?: string;
  reasoning: string;
  delayBreakdown: {
    readingMs: number;
    thinkingMs: number;
    typingMs: number;
    totalMs: number;
  };
  questionDescription?: string;
  optionsSummary?: string[];
  inputName?: string;
}

export type PersonaType =
  | 'tech_pro'
  | 'general_consumer'
  | 'enthusiastic_user'
  | 'thoughtful_evaluator'
  | 'student_researcher'
  | 'custom';

export type DelayProfile = 'realistic' | 'cautious' | 'fast' | 'custom';
export type EngineMode = 'hybrid' | 'deterministic' | 'ai';

export interface SimulationConfig {
  persona: PersonaType;
  customPersonaPrompt?: string;
  delayProfile: DelayProfile;
  engineMode?: EngineMode;
  minDelaySec: number;
  maxDelaySec: number;
  readingSpeedWpm: number;
  simulateKeystrokes: boolean;
  autoAdvance: boolean;
  requireConfirmBeforeSubmit: boolean;
  readingWpm?: number;
  typingCpm?: number;
  minThinkingDelayMs?: number;
  maxThinkingDelayMs?: number;
}

export type SessionStatus =
  | 'idle'
  | 'fetching'
  | 'parsing'
  | 'answering'
  | 'delaying'
  | 'submitting'
  | 'advancing'
  | 'completed'
  | 'paused'
  | 'error';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'gemini' | 'delay' | 'action' | 'success' | 'warn' | 'error';
  message: string;
  details?: any;
}

export interface ActiveDelayInfo {
  questionId?: string;
  questionTitle?: string;
  questionText?: string;
  currentAnswerValue?: string;
  phase: 'reading' | 'thinking' | 'typing' | 'page_transition';
  durationMs: number;
  remainingMs: number;
  startTime: number;
}

export interface PageHistoryEntry {
  pageIndex: number;
  pageTitle: string;
  url?: string;
  screenshotUrl?: string;
  rawHtml?: string;
  answers: QuestionAnswer[];
  submittedAt: number;
  pageDelayMs: number;
  pageDurationMs?: number;
  answersCount?: number;
}

export interface RedirectedSurveyArchive {
  archiveId: string;
  surveyTitle: string;
  originalSurveyUrl: string;
  redirectedToUrl: string;
  redirectTimestamp: number;
  reason: string;
  history: PageHistoryEntry[];
  lastPageSnapshot: {
    pageIndex: number;
    pageTitle: string;
    url: string;
    rawHtml?: string;
    screenshotUrl?: string;
    answers: QuestionAnswer[];
    submittedAt: number;
  };
  totalQuestionsAnswered: number;
  totalSimulatedDelayMs: number;
  totalDurationMs: number;
}

export interface SurveySession {
  sessionId: string;
  surveyUrl: string;
  status: SessionStatus;
  currentPageIndex: number;
  totalEstimatedPages: number;
  currentPageData: SurveyPage | null;
  currentAnswers: QuestionAnswer[];
  history: PageHistoryEntry[];
  logs: LogEntry[];
  totalQuestionsAnswered: number;
  totalSimulatedDelayMs: number;
  startedAt: number;
  completedAt?: number;
  activeDelay?: ActiveDelayInfo;
  errorMessage?: string;
  confirmationMessage?: string;
  config: SimulationConfig;
  redirectedSurveys?: RedirectedSurveyArchive[];
  latestRedirectedArchive?: RedirectedSurveyArchive;
}
