/**
 * FieldParser.ts
 * Implements Section 3, 10, 11 of README specification:
 * Extracts every field/control within a question container.
 * - Detects every <select> element and stores each as an independent field (Multi-Dropdown support).
 * - Detects radio groups, checkboxes, text, number, and textarea fields.
 * - Parses Confirmit custom control structures (.cf-radio-answer, .cf-checkbox-answer, .cf-dropdown-answer, etc.).
 * - Preserves original HTML field names without inventing names.
 */
import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import { QuestionField, FieldOption } from '../questions/QuestionModel.js';
import { OptionParser } from './OptionParser.js';

export class FieldParser {
  /**
   * Normalizes raw HTML input/select element names or IDs to their canonical field name.
   * Confirmit and modern responsive survey engines duplicate controls for mobile and desktop,
   * wrapping them in IDs like:
   *   "mobile_S3xY_1_input" -> "S3xY_1"
   *   "desktop_S3xY_1_input" -> "S3xY_1"
   *   "S3xY_1_input" -> "S3xY_1"
   * Strip responsive prefixes and control suffixes so only canonical POST fields remain.
   */
  public static normalizeFieldName(rawNameOrId: string): string {
    if (!rawNameOrId) return rawNameOrId;
    let name = rawNameOrId.trim();
    // Strip Confirmit responsive viewport prefixes: mobile_ or desktop_
    name = name.replace(/^(?:mobile_|desktop_)/i, '');
    // Strip _input suffix commonly appended to Confirmit form controls
    name = name.replace(/_input$/i, '');
    return name;
  }

  /**
   * Parse all fields inside a question container element
   */
  public static parseFields(
    $: CheerioAPI,
    questionContainer: Element,
    questionId: string,
    cfApiQuestionData?: any
  ): QuestionField[] {
    const fields: QuestionField[] = [];
    const seenFieldNames = new Set<string>();

    // 1. Check for <select> elements (Dropdowns & Multiple Dropdowns)
    $(questionContainer)
      .find('select')
      .each((_, sel) => {
        const rawName = $(sel).attr('name');
        const rawId = $(sel).attr('id') || '';
        // If explicit name attribute exists, prefer it; otherwise normalize id
        const name = rawName ? rawName.trim() : (FieldParser.normalizeFieldName(rawId) || rawId || `${questionId}_select`);
        
        // Deduplicate responsive desktop/mobile copies of the exact same dropdown control
        if (seenFieldNames.has(name)) return;
        seenFieldNames.add(name);

        const options = OptionParser.parseSelectOptions($, sel);
        const isRequired = $(sel).attr('required') !== undefined ||
                           $(sel).attr('aria-required') === 'true';

        // Extract label from nearest label, table column/row header, or data-labelledby
        let label = $(sel).prev('label').text().trim() ||
                    $(sel).closest('tr').find('th, td:first-child').text().trim() ||
                    $(`label[for="${rawId}"]`).text().trim() ||
                    $(`[id*="${name}_text"], [id*="${rawId.replace('_input', '')}_text"]`).first().text().trim() ||
                    undefined;

        // If no explicit DOM label found, look at the first placeholder option (e.g. <option value="">Years</option>)
        if (!label) {
          const placeholderOpt = $(sel).find('option[value=""], option:not([value])').first().text().trim();
          if (placeholderOpt && !/^(--|\.\.\.)?\s*(please\s+)?select\b/i.test(placeholderOpt)) {
            label = placeholderOpt;
          }
        }

        // Cross-reference cfApiQuestionData if available to enrich title/label
        if (cfApiQuestionData && Array.isArray(cfApiQuestionData.questions)) {
          const matchedSubQ = cfApiQuestionData.questions.find((q: any) =>
            q.answers?.some((a: any) => a.fieldName === name) ||
            q.questionId === name ||
            name.startsWith(q.questionId)
          );
          if (matchedSubQ && (matchedSubQ.dropdownTitle || matchedSubQ.title)) {
            label = matchedSubQ.dropdownTitle || matchedSubQ.title;
          }
        }

        fields.push({
          name,
          type: 'select',
          required: isRequired,
          options,
          label: label || undefined,
          defaultValue: $(sel).find('option[selected]').attr('value') || undefined,
        });
      });

    // 2. Check for radio buttons grouped by name
    const radioNames = new Set<string>();
    $(questionContainer)
      .find('input[type="radio"]')
      .each((_, el) => {
        const name = $(el).attr('name');
        if (name) radioNames.add(name);
      });

    for (const radioName of radioNames) {
      if (seenFieldNames.has(radioName)) continue;
      seenFieldNames.add(radioName);

      const options = OptionParser.parseInputOptions($, questionContainer, radioName);
      const isRequired = $(questionContainer)
        .find(`input[name="${radioName}"]`)
        .first()
        .attr('required') !== undefined ||
        $(questionContainer).attr('aria-required') === 'true';

      fields.push({
        name: radioName,
        type: 'radio',
        required: isRequired,
        options,
      });
    }

    // 3. Check for checkboxes
    const checkboxNames = new Set<string>();
    $(questionContainer)
      .find('input[type="checkbox"]')
      .each((_, el) => {
        const name = $(el).attr('name');
        if (name) checkboxNames.add(name);
      });

    for (const cbName of checkboxNames) {
      if (seenFieldNames.has(cbName)) continue;
      seenFieldNames.add(cbName);

      const options = OptionParser.parseInputOptions($, questionContainer, cbName);
      fields.push({
        name: cbName,
        type: 'checkbox',
        required: false,
        options,
      });
    }

    // 4. Check for text/number/date inputs and textarea
    $(questionContainer)
      .find('input[type="text"], input[type="number"], input[type="date"], input[type="email"], input[type="tel"], textarea')
      .each((_, el) => {
        const name = $(el).attr('name') || $(el).attr('id');
        if (!name || seenFieldNames.has(name)) return;
        seenFieldNames.add(name);

        const tagName = el.tagName.toLowerCase();
        const typeAttr = ($(el).attr('type') || (tagName === 'textarea' ? 'textarea' : 'text')).toLowerCase();
        const isRequired = $(el).attr('required') !== undefined || $(el).attr('aria-required') === 'true';
        const placeholder = $(el).attr('placeholder');
        const val = $(el).val() as string || $(el).attr('value') || undefined;

        fields.push({
          name,
          type: typeAttr === 'textarea' ? 'textarea' : typeAttr === 'number' ? 'number' : 'text',
          required: isRequired,
          placeholder,
          defaultValue: val,
        });
      });

    // 5. Confirmit Custom Elements (.cf-radio-answer, .cf-checkbox-answer, .cf-list)
    // When standard inputs are wrapped in Confirmit's custom HTML or dynamically initialized
    if (fields.length === 0 || fields.every(f => f.options?.length === 0)) {
      const confirmitRadios = $(questionContainer).find('.cf-radio-answer');
      if (confirmitRadios.length > 0) {
        const radioOptions: FieldOption[] = [];
        confirmitRadios.each((_, el) => {
          const id = $(el).attr('id') || '';
          const text = $(el).find('.cf-radio-answer__text').text().trim();
          // Extract option code from id (e.g. revision_1 -> code '1')
          let val = id.replace(`${questionId}_`, '').trim();
          if (!val) val = id;
          radioOptions.push({
            value: val,
            text: text || val,
          });
        });

        // The field name in Confirmit is usually the questionId itself
        const fieldName = cfApiQuestionData?.answers?.[0]?.fieldName || questionId;
        if (!seenFieldNames.has(fieldName)) {
          seenFieldNames.add(fieldName);
          fields.push({
            name: fieldName,
            type: 'radio',
            required: true,
            options: radioOptions,
          });
        }
      }

      const confirmitCheckboxes = $(questionContainer).find('.cf-checkbox-answer');
      if (confirmitCheckboxes.length > 0) {
        confirmitCheckboxes.each((_, el) => {
          const id = $(el).attr('id') || '';
          const text = $(el).find('.cf-checkbox-answer__text').text().trim();
          let code = id.replace(`${questionId}_`, '').trim() || id;
          const fieldName = id; // Confirmit multi checkboxes frequently use answer ID as field name
          if (!seenFieldNames.has(fieldName)) {
            seenFieldNames.add(fieldName);
            fields.push({
              name: fieldName,
              type: 'checkbox',
              required: false,
              options: [{ value: code, text: text || code }],
            });
          }
        });
      }
    }

    // 6. Augment or populate from cfApi JSON if available
    if (cfApiQuestionData) {
      // 6a. Support nested questions in Confirmit Grid3d or multi-dropdown structures
      if (Array.isArray(cfApiQuestionData.questions) && cfApiQuestionData.questions.length > 0) {
        for (const subQ of cfApiQuestionData.questions) {
          const subFieldName = subQ.answers?.[0]?.fieldName || subQ.questionId;
          const subScales = Array.isArray(subQ.scales) ? subQ.scales : [];
          const subAnswers = Array.isArray(subQ.answers) ? subQ.answers : [];
          const optionsList = (subScales.length > 0 ? subScales : subAnswers).map((s: any) => ({
            value: String(s.code ?? s.value ?? s.fieldName ?? ''),
            text: String(s.text || s.code || ''),
          }));

          let existing = fields.find(f => f.name === subFieldName || FieldParser.normalizeFieldName(f.name) === subFieldName);
          if (existing) {
            existing.name = subFieldName; // Ensure canonical Confirmit field name
            if (!existing.label && (subQ.dropdownTitle || subQ.title)) {
              existing.label = subQ.dropdownTitle || subQ.title;
            }
            if ((!existing.options || existing.options.length === 0) && optionsList.length > 0) {
              existing.options = optionsList;
            }
          } else if (fields.length === 0 && subFieldName) {
            seenFieldNames.add(subFieldName);
            fields.push({
              name: subFieldName,
              type: subQ.dropdown ? 'select' : 'radio',
              required: subQ.required ?? true,
              options: optionsList,
              label: subQ.dropdownTitle || subQ.title,
            });
          }
        }
      }

      // 6b. Standard single/multi questions in cfApi
      if (Array.isArray(cfApiQuestionData.answers) && cfApiQuestionData.answers.length > 0) {
        if (fields.length === 0) {
          const isMulti = cfApiQuestionData.nodeType === 'Multi' || !!cfApiQuestionData.multiCount;
          const mainFieldName = cfApiQuestionData.answers[0]?.fieldName || questionId;
          const options: FieldOption[] = cfApiQuestionData.answers.map((a: any) => ({
            value: a.code || a.fieldName,
            text: a.text || a.code || '',
            score: a.score,
            isExclusive: a.isExclusive,
          }));

          if (isMulti) {
            for (const ans of cfApiQuestionData.answers) {
              const fName = ans.fieldName || `${questionId}_${ans.code}`;
              if (!seenFieldNames.has(fName)) {
                seenFieldNames.add(fName);
                fields.push({
                  name: fName,
                  type: 'checkbox',
                  required: false,
                  options: [{ value: ans.code, text: ans.text || ans.code }],
                });
              }
            }
          } else {
            if (!seenFieldNames.has(mainFieldName)) {
              seenFieldNames.add(mainFieldName);
              fields.push({
                name: mainFieldName,
                type: cfApiQuestionData.dropdown ? 'select' : 'radio',
                required: cfApiQuestionData.required ?? true,
                options,
              });
            }
          }
        } else {
          // Enrich existing fields with cfApi options if Cheerio missed labels
          for (const field of fields) {
            if (!field.options || field.options.length === 0) {
              const matchAnswers = cfApiQuestionData.answers.filter((a: any) => a.fieldName === field.name);
              if (matchAnswers.length > 0) {
                field.options = matchAnswers.map((a: any) => ({
                  value: a.code,
                  text: a.text || a.code,
                }));
              }
            }
          }
        }
      }
    }

    return fields;
  }
}
