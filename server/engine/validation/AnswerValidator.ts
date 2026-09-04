/**
 * AnswerValidator.ts
 * Section 15, 18 of README specification:
 * Validates that all required questions and fields on the page have valid responses
 * and that selected options exist in the actual HTML structure before submitting.
 * Auto-repairs missing answers using deterministic defaults so the engine never stalls.
 */
import { PageModel, PageAnswersModel, QuestionField } from '../questions/QuestionModel.js';

export interface ValidationResult {
  valid: boolean;
  missingRequiredFields: string[];
  invalidOptionFields: string[];
  repairedAnswers: PageAnswersModel;
  logs: string[];
}

export class AnswerValidator {
  public static validateAndRepair(pageModel: PageModel, answers: PageAnswersModel): ValidationResult {
    const missingRequiredFields: string[] = [];
    const invalidOptionFields: string[] = [];
    const logs: string[] = [];
    const repaired: PageAnswersModel = JSON.parse(JSON.stringify(answers));

    for (const question of pageModel.questions) {
      if (question.isInfoOnly || question.fields.length === 0) continue;

      let qAns = repaired[question.id];
      if (!qAns) {
        qAns = { fields: {} };
        repaired[question.id] = qAns;
      }

      for (const field of question.fields) {
        let val = qAns.fields[field.name];

        // If field is required or there is an active validation error on the page
        const isRequired = field.required || question.required || pageModel.errors.length > 0;

        if (isRequired) {
          const isMissing =
            val === undefined ||
            val === null ||
            val === '' ||
            (Array.isArray(val) && val.length === 0);

          if (isMissing) {
            missingRequiredFields.push(field.name);
            const repairVal = this.getSafeRepairValue(field);
            qAns.fields[field.name] = repairVal;
            logs.push(`Auto-repaired required field [${field.name}] with safe value [${repairVal}]`);
          }
        }

        // Validate option existence for selects and radios
        val = qAns.fields[field.name];
        if (val !== undefined && field.options && field.options.length > 0) {
          const validOptionValues = new Set(field.options.map(o => o.value));
          if (Array.isArray(val)) {
            const filtered = val.filter(v => validOptionValues.has(v));
            if (filtered.length === 0 && validOptionValues.size > 0) {
              invalidOptionFields.push(field.name);
              qAns.fields[field.name] = [field.options[0].value];
            } else {
              qAns.fields[field.name] = filtered;
            }
          } else if (typeof val === 'string') {
            if (!validOptionValues.has(val) && validOptionValues.size > 0) {
              invalidOptionFields.push(field.name);
              // Pick first valid non-empty option
              const fallbackOpt = field.options.find(o => o.value !== '') || field.options[0];
              qAns.fields[field.name] = fallbackOpt.value;
              logs.push(`Corrected invalid option for [${field.name}]: replaced with [${fallbackOpt.value}]`);
            }
          }
        }
      }
    }

    const isValid = missingRequiredFields.length === 0 && invalidOptionFields.length === 0;

    return {
      valid: isValid,
      missingRequiredFields,
      invalidOptionFields,
      repairedAnswers: repaired,
      logs,
    };
  }

  private static getSafeRepairValue(field: QuestionField): any {
    if (field.options && field.options.length > 0) {
      // Skip empty-string and "0" placeholder options (common Confirmit select placeholders)
      const nonEmpties = field.options.filter(o => o.value !== '' && o.value !== '0');
      const opt = nonEmpties.length > 0 ? nonEmpties[0] : field.options[0];
      return field.type === 'checkbox' ? [opt.value] : opt.value;
    }

    if (field.type === 'number') return 25;
    if (field.type === 'textarea') return 'No further comment.';
    return '1';
  }
}
