/**
 * QuestionTypes.ts
 * Classification of question types supported by the Confirmit Survey Automation Engine.
 */

export type QuestionTypeEnum =
  | 'SINGLE'
  | 'MULTIPLE'
  | 'DROPDOWN'
  | 'MULTI_DROPDOWN'
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DATE'
  | 'RATING'
  | 'GRID'
  | 'MATRIX'
  | 'RANKING'
  | 'SLIDER'
  | 'MAXDIFF'
  | 'INFO'
  | 'UNKNOWN';

export type FieldControlKind =
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'slider'
  | 'rating'
  | 'hidden'
  | 'other';
