/**
 * BrowserSurveySubmitter.ts
 * Submits survey answers via the Puppeteer BrowserClient instead of plain
 * HTTP POST. This lets Confirmit's JavaScript run normally so hidden state
 * fields (VSL token, revision, cfApi tokens) are handled by the browser.
 */
import { BrowserClient } from '../client/BrowserClient.js';
import { PageModel, PageAnswersModel } from '../questions/QuestionModel.js';
import { PageParser } from '../parser/PageParser.js';
import { SubmitResult } from './SurveySubmitter.js';
import { PlatformConfig } from '../platforms/types.js';

export class BrowserSurveySubmitter {
  constructor(
    private client: BrowserClient,
    private platform?: PlatformConfig
  ) {}

  async submit(
    currentPage: PageModel,
    validatedAnswers: PageAnswersModel,
    signal?: AbortSignal
  ): Promise<SubmitResult> {
    // Some platforms (e.g. Confirmit) inject internal tracking fields whose
    // "question text" is CSS code — skip those using the platform's pattern.
    const cssFieldPattern = this.platform?.cssFieldPattern ?? /\{[^}]*display\s*:\s*none/i;
    const questionTextById = new Map(currentPage.questions.map(q => [q.id, q.text]));

    const fieldValues: Record<string, string | string[]> = {};
    for (const [questionId, answer] of Object.entries(validatedAnswers)) {
      const qText = questionTextById.get(questionId) || '';
      if (cssFieldPattern.test(qText)) continue; // skip internal Confirmit tracking field
      for (const [fieldName, value] of Object.entries(answer.fields)) {
        if (value === null || value === undefined) continue;
        fieldValues[fieldName] = Array.isArray(value) ? value.map(String) : String(value);
      }
    }

    const result = await this.client.fillAndSubmit(fieldValues, this.platform?.submitSelectors);
    const nextPage = PageParser.parse(result.html, result.url);

    return {
      nextPage,
      httpStatus: result.status,
      finalUrl: result.url,
      hasErrors: nextPage.errors.length > 0,
      errors: nextPage.errors,
    };
  }
}
