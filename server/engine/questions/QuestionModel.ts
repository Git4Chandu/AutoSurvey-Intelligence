/**
 * QuestionModel.ts
 * Core data models conforming to Section 3, 8, 10 of README specification:
 * - Every question contains one or more fields.
 * - Field names match exact HTML form input/select names.
 */
import { QuestionTypeEnum, FieldControlKind } from './QuestionTypes.js';

export interface FieldOption {
  value: string;
  text: string;
  score?: number | null;
  isExclusive?: boolean;
}

export interface QuestionField {
  name: string;
  type: FieldControlKind;
  required: boolean;
  options?: FieldOption[];
  defaultValue?: string;
  placeholder?: string;
  minValue?: number;
  maxValue?: number;
  label?: string;
}

export interface QuestionModel {
  id: string;
  text: string;
  type: QuestionTypeEnum;
  required: boolean;
  fields: QuestionField[];
  options?: FieldOption[]; // Flattened or primary options
  instruction?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  isInfoOnly?: boolean;
  isHiddenForLive?: boolean;
}

export interface FormModel {
  action: string;
  method: 'GET' | 'POST';
  id?: string;
}

export interface PageModel {
  url: string;
  title: string;
  description?: string;
  form: FormModel;
  hiddenFields: Record<string, string>;
  questions: QuestionModel[];
  errors: string[];
  revision: string | null;
  completed: boolean;
  completionMessage?: string;
  submitButtonLabel: string;
  isInfoOnly: boolean;
  isHiddenPage: boolean;
  pageIndex?: number;
  totalEstimatedPages?: number;
  rawHtml?: string;
}

export interface AnswerFieldMap {
  [fieldName: string]: string | string[] | number;
}

export interface QuestionAnswerRecord {
  fields: AnswerFieldMap;
  reasoning?: string;
  delayBreakdown?: {
    readingMs: number;
    thinkingMs: number;
    typingMs: number;
    totalMs: number;
  };
}

export interface PageAnswersModel {
  [questionId: string]: QuestionAnswerRecord;
}
