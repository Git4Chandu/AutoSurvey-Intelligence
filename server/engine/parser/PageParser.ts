/**
 * PageParser.ts
 * Implements Section 7 of README specification:
 * Converts raw HTML into a structured PageModel:
 * - Form action, method
 * - Hidden fields & state tokens
 * - Questions with their fields
 * - Validation errors
 * - Completion detection
 */
import * as cheerio from 'cheerio';
import { PageModel, FormModel } from '../questions/QuestionModel.js';
import { QuestionParser } from './QuestionParser.js';
import { CompletionDetector } from './CompletionDetector.js';

export class PageParser {
  /**
   * Parse HTML string into structured PageModel
   */
  public static parse(html: string, currentUrl: string): PageModel {
    const $ = cheerio.load(html);

    // 1. Completion detection
    const completionResult = CompletionDetector.isCompleted($, currentUrl, html);

    // 2. Extract window.cfApi questions if present
    let cfApiList: any[] | undefined;
    const cfApiMatch = html.match(/new\s+window\.cfApi\(\s*(\[[\s\S]+?\])\s*[,;]/);
    if (cfApiMatch) {
      try {
        cfApiList = JSON.parse(cfApiMatch[1]);
      } catch (err) {
        // Syntax error in custom script block - continue with DOM parsing
      }
    }

    // 3. Form action & method
    const formEl = $('form').first();
    const rawAction = formEl.attr('action') || '';
    let formAction = currentUrl;
    if (rawAction) {
      try {
        formAction = new URL(rawAction, currentUrl).toString();
      } catch {
        formAction = rawAction;
      }
    }

    const formMethod = (formEl.attr('method') || 'POST').toUpperCase() === 'GET' ? 'GET' : 'POST';
    const form: FormModel = {
      action: formAction,
      method: formMethod,
      id: formEl.attr('id'),
    };

    // 4. Extract hidden fields & state
    const hiddenFields: Record<string, string> = {};
    $('form input[type="hidden"]').each((_, el) => {
      const name = $(el).attr('name');
      const val = $(el).attr('value') ?? '';
      if (name) {
        hiddenFields[name] = val;
      }
    });

    // Extract revision if present in hidden inputs or state
    const revision = hiddenFields['revision'] || null;

    // 5. Extract validation error messages
    const errors: string[] = [];
    $(
      '.cf-error-list li, .cf-error-block:not(.cf-error-block--hidden) li, .alert-danger, .error-message, .error-summary li, .validation-summary-errors li, .invalid-feedback, [role="alert"]'
    ).each((_, el) => {
      const txt = $(el).text().trim();
      if (txt && !errors.includes(txt)) {
        errors.push(txt);
      }
    });

    // 6. Parse questions
    const questions = QuestionParser.parseAllQuestions($, cfApiList);

    // 7. Page title & submit button label
    let title = $('h1, .cf-page__title, .page-title, title').first().text().trim();
    if (!title || title.length > 80) {
      title = questions[0]?.text || 'Survey Questionnaire';
    }

    const submitBtn = $('input[type="submit"], button[type="submit"], button.cf-navigation-button--next, button:contains("Next"), button:contains("Continue")').first();
    const submitButtonLabel = submitBtn.val() as string || submitBtn.text().trim() || 'Continue';

    // Page flags
    const isHiddenPage =
      title.toUpperCase().includes('HIDDEN IN LIVE') ||
      questions.some(q => q.isHiddenForLive) ||
      html.includes('/* This question to visible only during testing */');

    const isInfoOnly =
      questions.length === 0 ||
      questions.every(q => q.isInfoOnly || q.fields.length === 0);

    return {
      url: currentUrl,
      title,
      form,
      hiddenFields,
      questions,
      errors,
      revision,
      completed: completionResult.completed,
      completionMessage: completionResult.message,
      submitButtonLabel,
      isInfoOnly,
      isHiddenPage,
      rawHtml: html,
    };
  }
}
