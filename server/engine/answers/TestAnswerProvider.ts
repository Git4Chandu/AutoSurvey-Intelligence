/**
 * TestAnswerProvider.ts
 * Section 13 of README specification:
 * High-speed, deterministic, rule-based answering engine.
 * Solves multiple dropdowns, matrices, single/multi choice, text, and numbers
 * using real HTML field names and option values.
 */
import { IAnswerProvider, AnswerContext } from './AnswerProvider.js';
import { PageModel, PageAnswersModel, QuestionField, QuestionModel } from '../questions/QuestionModel.js';
import { isSelectPlaceholder } from '../parser/OptionParser.js';

export class TestAnswerProvider implements IAnswerProvider {
  public async getAnswers(pageModel: PageModel, context: AnswerContext): Promise<PageAnswersModel> {
    const results: PageAnswersModel = {};

    for (const question of pageModel.questions) {
      if (question.isInfoOnly || question.fields.length === 0) {
        continue;
      }

      // If question is hidden for live and has no validation error, and is on test setup page
      // Some test pages can be submitted empty. But if errors are present or required, answer it!
      const mustAnswer = question.required || pageModel.errors.length > 0 || !question.isHiddenForLive;

      const fieldAnswers: Record<string, any> = {};

      for (const field of question.fields) {
        const fieldVal = this.generateFieldAnswer(field, question, context);
        if (fieldVal !== undefined && fieldVal !== null) {
          fieldAnswers[field.name] = fieldVal;
        }
      }

      // If it's a single question where Confirmit expects question.id as field
      if (Object.keys(fieldAnswers).length === 0 && question.fields.length > 0 && mustAnswer) {
        const firstField = question.fields[0];
        const val = this.generateFieldAnswer(firstField, question, context);
        if (val !== undefined) {
          fieldAnswers[firstField.name] = val;
        }
      }

      results[question.id] = {
        fields: fieldAnswers,
        reasoning: `Selected based on respondent profile [${context.persona}] adhering to questionnaire constraints.`,
        delayBreakdown: {
          readingMs: 600,
          thinkingMs: 400,
          typingMs: 200,
          totalMs: 1200,
        },
      };
    }

    return results;
  }

  private generateFieldAnswer(
    field: QuestionField,
    question: QuestionModel,
    context: AnswerContext
  ): any {
    switch (field.type) {
      case 'select': {
        if (!field.options || field.options.length === 0) return '1';
        // Filter out placeholders
        const validOptions = field.options.filter(o => !isSelectPlaceholder(o));
        const listToUse = validOptions.length > 0 ? validOptions : field.options.filter(o => o.value !== '');
        if (listToUse.length > 0) {
          const attempt = context.attemptIndex || 0;
          const chosen = listToUse[attempt % listToUse.length];
          return chosen.value;
        }
        return field.options[0]?.value || '1';
      }

      case 'radio': {
        if (!field.options || field.options.length === 0) return '1';
        const validOptions = field.options.filter(o => o.value !== '' && !isSelectPlaceholder(o));
        const listToUse = validOptions.length > 0 ? validOptions : field.options;
        const attempt = context.attemptIndex || 0;
        return listToUse[attempt % listToUse.length]?.value ?? '1';
      }

      case 'checkbox': {
        if (!field.options || field.options.length === 0) return [field.name];
        // Select 1 valid option (prefer non-exclusive)
        const nonExclusive = field.options.filter(o => !o.isExclusive && o.value !== '');
        if (nonExclusive.length > 0) {
          return [nonExclusive[0].value];
        }
        return [field.options[0].value];
      }

      case 'number': {
        if (field.minValue !== undefined) return field.minValue;
        return 25; // Default sensible number
      }

      case 'textarea': {
        return 'Overall experience is smooth and satisfactory. Navigation is clear and user friendly.';
      }

      case 'text':
      default: {
        const lowerName = field.name.toLowerCase();
        const lowerLabel = (field.label || '').toLowerCase();
        const lowerTitle = question.text.toLowerCase();

        if (lowerName.includes('age') || lowerTitle.includes('how old')) {
          return '34';
        }
        if (lowerName.includes('zip') || lowerTitle.includes('zip code') || lowerTitle.includes('postal')) {
          return '90210';
        }
        if (lowerName.includes('email') || lowerTitle.includes('email')) {
          return 'respondent.test@example.com';
        }
        if (lowerName.includes('speeder')) {
          return '0';
        }
        return 'Good';
      }
    }
  }
}
