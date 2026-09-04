/**
 * FormBuilder.ts
 * Section 16 of README specification:
 * Converts structured answers and page state into the exact POST payload
 * required by Confirmit and survey engines:
 * - Hidden fields (__sid__, __prevPageProgress, __pagemasterid, __theme, l, etc.)
 * - Revision / state tokens
 * - Every dropdown added independently with its real field name (e.g. Q20_1, Q20_2)
 * - Single-choice and matrix rows
 * - Checkboxes (repeated parameter names or single keys)
 * - Text, number, and textarea fields
 */
import { PageModel, PageAnswersModel } from '../questions/QuestionModel.js';

export class FormBuilder {
  /**
   * Build URLSearchParams payload for POST submission
   */
  public static buildPostPayload(
    pageModel: PageModel,
    validatedAnswers: PageAnswersModel
  ): URLSearchParams {
    const params = new URLSearchParams();

    // 1. Add all hidden fields preserved from the page
    for (const [key, val] of Object.entries(pageModel.hiddenFields)) {
      params.append(key, val);
    }

    // 2. Add question answers
    for (const [questionId, qAns] of Object.entries(validatedAnswers)) {
      if (!qAns || !qAns.fields) continue;

      for (const [fieldName, val] of Object.entries(qAns.fields)) {
        if (val === undefined || val === null) continue;

        if (Array.isArray(val)) {
          // Multiple values for checkbox group or multi-select
          for (const item of val) {
            params.append(fieldName, String(item));
          }
        } else {
          // Single value: dropdown, radio, text, number
          params.append(fieldName, String(val));
        }
      }
    }

    // 3. If there is a revision field required by Confirmit and not yet added
    if (pageModel.revision && !params.has('revision')) {
      params.append('revision', pageModel.revision);
    }

    return params;
  }
}
