/**
 * QuestionParser.ts
 * Implements Section 8, 9, 22 of README specification:
 * Identifies every survey question, maps all its fields, extracts options,
 * determines question type, and preserves original HTML field names.
 */
import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import { QuestionModel, QuestionField } from '../questions/QuestionModel.js';
import { QuestionTypeEnum } from '../questions/QuestionTypes.js';
import { FieldParser } from './FieldParser.js';
import { OptionParser } from './OptionParser.js';

export class QuestionParser {
  /**
   * Parse all questions found in the document
   */
  public static parseAllQuestions($: CheerioAPI, cfApiList?: any[]): QuestionModel[] {
    const questions: QuestionModel[] = [];
    const processedQuestionIds = new Set<string>();

    // 1. Confirmit .cf-question containers
    $('.cf-question').each((i, el) => {
      const q = this.parseQuestionElement($, el, i, cfApiList);
      if (q && !processedQuestionIds.has(q.id)) {
        processedQuestionIds.add(q.id);
        questions.push(q);
      }
    });

    // 2. Generic survey question containers (capture any additional questions on the page)
    $('.question, [data-question-id], fieldset.survey-group, .form-group, .survey-question, .cf-dropdown').each((i, el) => {
      // Skip if this container is inside an already processed container
      if ($(el).closest('.cf-question').length > 0) return;

      const q = this.parseQuestionElement($, el, questions.length + i, cfApiList);
      if (q && !processedQuestionIds.has(q.id)) {
        // Only add if it introduces at least one new field
        const hasNewField = q.fields.length > 0 && q.fields.some(f => {
          return !questions.some(existingQ => existingQ.fields.some(ef => ef.name === f.name));
        });
        if (hasNewField || q.fields.length === 0) {
          processedQuestionIds.add(q.id);
          questions.push(q);
        }
      }
    });

    // 3. Guarantee all <select> elements in any <form> are parsed (prevent unhandled dropdowns)
    const existingFieldNames = new Set<string>();
    for (const q of questions) {
      for (const f of q.fields) {
        existingFieldNames.add(f.name);
      }
    }

    $('form select').each((i, sel) => {
      const name = $(sel).attr('name') || $(sel).attr('id') || `select_${i + 1}`;
      if (existingFieldNames.has(name)) return;

      const qId = $(sel).attr('id') || name;
      if (processedQuestionIds.has(qId)) return;

      const parentContainer = $(sel).closest('.form-group, .question, .cf-dropdown, fieldset, tr, p, div');
      const labelText =
        $(`label[for="${$(sel).attr('id')}"]`).text().trim() ||
        $(sel).prev('label').text().trim() ||
        $(sel).closest('label').text().trim() ||
        parentContainer.find('.question-title, .cf-question__text, label, h3, h4, strong').first().text().trim() ||
        $(sel).attr('placeholder') ||
        name;

      const options = OptionParser.parseSelectOptions($, sel);
      const isRequired = $(sel).attr('required') !== undefined || $(sel).attr('aria-required') === 'true';

      const fields: QuestionField[] = [{
        name,
        type: 'select',
        required: isRequired,
        options,
        defaultValue: $(sel).find('option[selected]').attr('value') || undefined,
      }];

      existingFieldNames.add(name);
      processedQuestionIds.add(qId);
      questions.push({
        id: qId,
        text: labelText,
        type: 'DROPDOWN',
        required: isRequired,
        fields,
      });
    });

    // 4. If still no questions found, check for other orphan inputs inside form
    if (questions.length === 0) {
      $('form').each((_, formEl) => {
        const radios = $(formEl).find('input[type="radio"]');
        const checkboxes = $(formEl).find('input[type="checkbox"]');
        const texts = $(formEl).find('input[type="text"], textarea');

        if (radios.length > 0 || checkboxes.length > 0 || texts.length > 0) {
          const fields = FieldParser.parseFields($, formEl as any, 'Q_main');
          if (fields.length > 0) {
            questions.push({
              id: 'Q_main',
              text: $('h1, h2, legend').first().text().trim() || 'Survey Questions',
              type: this.determineQuestionType(fields),
              required: fields.some(f => f.required),
              fields,
            });
          }
        }
      });
    }

    // 4. Enrich from cfApi if any questions were in cfApi but didn't have visual .cf-question
    if (cfApiList && Array.isArray(cfApiList)) {
      for (const cfQ of cfApiList) {
        const qId = cfQ.questionId || cfQ.title;
        if (!qId || processedQuestionIds.has(qId)) continue;

        // Skip internal/speeder background tracking if it has no UI
        if (qId === 'relevantID' || qId === 'verisoul' || qId === 'ipaddress') continue;

        const dummyContainer = $(`#${qId}`).length ? $(`#${qId}`)[0] : null;
        const fields = FieldParser.parseFields($, (dummyContainer || $('body')[0]) as any, qId, cfQ);

        processedQuestionIds.add(qId);
        questions.push({
          id: qId,
          text: cfQ.text || qId,
          type: this.inferTypeFromCf(cfQ, fields),
          required: cfQ.required ?? false,
          fields,
          instruction: cfQ.instruction,
        });
      }
    }

    return questions;
  }

  private static parseQuestionElement(
    $: CheerioAPI,
    el: Element,
    index: number,
    cfApiList?: any[]
  ): QuestionModel | null {
    const rawId = $(el).attr('id') || $(el).attr('data-question-id') || `Q${index + 1}`;
    let questionId = rawId.trim();

    // Check if matched in cfApi
    const cfData = cfApiList?.find(
      q => q.questionId === questionId || q.title === questionId || q.entityId === questionId
    );

    // Question title & text
    let title = $(el).find('.cf-question__text, .cf-question__title, .question-title, .question-text, .title, legend, h2, h3, h4, .form-label, label.question, strong.question').first().text().trim();
    if (!title && cfData?.text) {
      title = cfData.text.trim();
    }
    if (!title) {
      // Look for first non-empty text node or label before inputs
      const firstLabel = $(el).find('label:not(.options-list label):not(.cf-radio-answer):not(.cf-checkbox-answer)').first().text().trim();
      title = firstLabel || $(el).find('p, span').first().text().trim() || questionId;
    }

    const instruction = $(el).find('.cf-question__instruction, .instruction').text().trim() || undefined;
    const isHiddenForLive =
      title.toUpperCase().includes('HIDDEN IN LIVE') ||
      title.toUpperCase().includes('HIDDEN FOR LIVE') ||
      $(el).attr('style')?.includes('display: none') ||
      $(el).hasClass('cf-question--hidden');

    // Parse fields belonging to this question
    const fields = FieldParser.parseFields($, el, questionId, cfData);

    // Validation error banner for this specific question
    const errorEl = $(el).find('.cf-question__error:not(.cf-error-block--hidden), .error-message, .alert-danger');
    const errorMessage = errorEl.length > 0 ? errorEl.text().trim() : undefined;

    const isRequired =
      $(el).attr('aria-required') === 'true' ||
      $(el).find('[required], [aria-required="true"]').length > 0 ||
      cfData?.required === true ||
      fields.some(f => f.required);

    const questionType = this.determineQuestionType(fields, cfData);

    const isInfoOnly =
      fields.length === 0 ||
      title.toLowerCase().includes('thank you for agreeing') ||
      $(el).hasClass('cf-question--info');

    // If unknown question type without fields, log as required by Section 22
    if (questionType === 'UNKNOWN' && !isInfoOnly) {
      console.warn(`[QuestionParser] UNKNOWN QUESTION DETECTED: ID=${questionId}, Text="${title.slice(0, 50)}"`);
    }

    return {
      id: questionId,
      text: title,
      type: questionType,
      required: isRequired,
      fields,
      instruction,
      errorMessage,
      isInfoOnly,
      isHiddenForLive,
    };
  }

  /**
   * Determine high-level QuestionType based on parsed fields and metadata
   */
  public static determineQuestionType(fields: QuestionField[], cfData?: any): QuestionTypeEnum {
    if (fields.length === 0) {
      return 'INFO';
    }

    const selectFields = fields.filter(f => f.type === 'select');
    if (selectFields.length > 1) {
      return 'MULTI_DROPDOWN';
    }
    if (selectFields.length === 1 && fields.length === 1) {
      return 'DROPDOWN';
    }

    const radioFields = fields.filter(f => f.type === 'radio');
    if (radioFields.length === 1 && fields.length === 1) {
      return 'SINGLE';
    }
    if (radioFields.length > 1) {
      return 'GRID'; // Multiple radio rows = Matrix / Grid
    }

    const checkboxFields = fields.filter(f => f.type === 'checkbox');
    if (checkboxFields.length >= 1 && fields.every(f => f.type === 'checkbox')) {
      return 'MULTIPLE';
    }

    const textFields = fields.filter(f => f.type === 'text' || f.type === 'textarea' || f.type === 'number');
    if (textFields.length === 1 && fields.length === 1) {
      return textFields[0].type === 'textarea'
        ? 'TEXTAREA'
        : textFields[0].type === 'number'
        ? 'NUMBER'
        : 'TEXT';
    }
    if (textFields.length > 1 && fields.every(f => f.type === 'text' || f.type === 'number')) {
      return 'GRID';
    }

    if (cfData?.nodeType === 'Single') return 'SINGLE';
    if (cfData?.nodeType === 'Multi') return 'MULTIPLE';
    if (cfData?.nodeType === 'Grid') return 'GRID';

    return 'UNKNOWN';
  }

  private static inferTypeFromCf(cfQ: any, fields: QuestionField[]): QuestionTypeEnum {
    if (cfQ.nodeType === 'Single') return cfQ.dropdown ? 'DROPDOWN' : 'SINGLE';
    if (cfQ.nodeType === 'Multi') return 'MULTIPLE';
    if (cfQ.nodeType === 'Grid') return 'GRID';
    return this.determineQuestionType(fields);
  }
}
