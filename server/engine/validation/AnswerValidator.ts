/**
 * AnswerValidator.ts
 * Section 15, 18 of README specification:
 * Validates that all required questions and fields on the page have valid responses
 * and that selected options exist in the actual HTML structure before submitting.
 * Auto-repairs missing answers using deterministic defaults so the engine never stalls.
 */
import { PageModel, PageAnswersModel, QuestionField } from '../questions/QuestionModel.js';
import { isSelectPlaceholder } from '../parser/OptionParser.js';

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
        let val: any = qAns.fields[field.name];

        // In online surveys, radio/select choices and required fields must always have a valid value to advance
        const isRequired =
          field.required ||
          question.required ||
          pageModel.errors.length > 0 ||
          field.type === 'radio' ||
          field.type === 'select';

        const isPlaceholderVal =
          field.type === 'select' &&
          (val === '' || isSelectPlaceholder({ value: String(val || '') }));

        const isMissing =
          val === undefined ||
          val === null ||
          val === '' ||
          isPlaceholderVal ||
          (Array.isArray(val) && val.length === 0);

        if (isRequired && isMissing) {
          missingRequiredFields.push(field.name);
          const repairVal = this.getSafeRepairValue(field);
          qAns.fields[field.name] = repairVal;
          logs.push(`Auto-repaired required/dropdown field [${field.name}] with safe value [${repairVal}]`);
        }

        // Validate option existence for selects and radios
        val = qAns.fields[field.name];
        if (val !== undefined && field.options && field.options.length > 0) {
          const validOptionValues = new Set(field.options.map(o => o.value));

          if (Array.isArray(val)) {
            const filtered = val.filter(v => validOptionValues.has(v) && !isSelectPlaceholder({ value: v }));
            if (filtered.length === 0 && validOptionValues.size > 0) {
              invalidOptionFields.push(field.name);
              const safeVal = this.getSafeRepairValue(field);
              qAns.fields[field.name] = Array.isArray(safeVal) ? safeVal : [safeVal];
            } else {
              qAns.fields[field.name] = filtered;
            }
          } else if (typeof val === 'string') {
            // First check if value matches option label (e.g. AI returned label instead of value)
            const strVal = String(val ?? '');
            if (!validOptionValues.has(strVal)) {
              const matchByLabel = field.options.find(
                o => o.text.trim().toLowerCase() === strVal.trim().toLowerCase()
              );
              if (matchByLabel && !isSelectPlaceholder(matchByLabel)) {
                qAns.fields[field.name] = matchByLabel.value;
                logs.push(`Mapped label [${strVal}] to option value [${matchByLabel.value}] for [${field.name}]`);
                val = matchByLabel.value;
              } else {
                invalidOptionFields.push(field.name);
                const safeVal = this.getSafeRepairValue(field);
                qAns.fields[field.name] = safeVal;
                logs.push(`Corrected invalid option for [${field.name}]: replaced with [${safeVal}]`);
                val = safeVal;
              }
            }

            // If it resolved to a placeholder value, replace with real valid option
            if (field.type === 'select' && (isSelectPlaceholder({ value: String(val ?? '') }) || val === '')) {
              const safeVal = this.getSafeRepairValue(field);
              qAns.fields[field.name] = safeVal;
              logs.push(`Replaced placeholder selection [${val}] with valid option [${safeVal}] for dropdown [${field.name}]`);
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
      const nonPlaceholders = field.options.filter(o => !isSelectPlaceholder(o));
      const candidates = nonPlaceholders.length > 0 ? nonPlaceholders : field.options.filter(o => o.value !== '');
      const opt = candidates.length > 0 ? candidates[0] : field.options[0];
      return field.type === 'checkbox' ? [opt.value] : opt.value;
    }

    if (field.type === 'number') return 25;
    if (field.type === 'textarea') return 'No further comment.';
    return '1';
  }
}
