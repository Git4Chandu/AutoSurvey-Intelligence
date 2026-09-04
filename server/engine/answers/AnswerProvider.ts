/**
 * AnswerProvider.ts
 * Section 12 of README: Abstract interface for answer generation.
 */
import { PageModel, PageAnswersModel } from '../questions/QuestionModel.js';

export interface AnswerContext {
  persona: string;
  customPersonaPrompt?: string;
  pageIndex: number;
  surveyUrl: string;
  previousAnswers?: any[];
}

export interface IAnswerProvider {
  getAnswers(pageModel: PageModel, context: AnswerContext): Promise<PageAnswersModel>;
}
