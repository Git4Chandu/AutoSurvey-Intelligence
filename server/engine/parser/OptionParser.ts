/**
 * OptionParser.ts
 * Extracts available options (values, labels, scores) from HTML elements.
 */
import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import { FieldOption } from '../questions/QuestionModel.js';

export class OptionParser {
  /**
   * Extract options from a <select> element
   */
  public static parseSelectOptions($: CheerioAPI, selectEl: Element): FieldOption[] {
    const options: FieldOption[] = [];
    $(selectEl)
      .find('option')
      .each((_, opt) => {
        const value = $(opt).attr('value');
        const text = $(opt).text().trim();
        // Ignore empty placeholder values if they don't have actual text or are disabled
        if (value !== undefined) {
          options.push({
            value: value,
            text: text || value,
          });
        }
      });
    return options;
  }

  /**
   * Extract options from radio or checkbox input groups
   */
  public static parseInputOptions(
    $: CheerioAPI,
    container: Element,
    inputName: string
  ): FieldOption[] {
    const options: FieldOption[] = [];
    const seenValues = new Set<string>();

    $(container)
      .find(`input[name="${inputName}"]`)
      .each((_, el) => {
        const value = $(el).attr('value') || '';
        if (seenValues.has(value)) return;
        seenValues.add(value);

        const id = $(el).attr('id');
        let labelText = '';

        if (id) {
          labelText = $(`label[for="${id}"]`).text().trim();
        }
        if (!labelText) {
          const parentLabel = $(el).closest('label');
          if (parentLabel.length) {
            labelText = parentLabel.text().trim();
          }
        }
        if (!labelText) {
          // Check sibling or parent text
          const parent = $(el).parent();
          labelText = parent.find('.cf-radio-answer__text, .cf-checkbox-answer__text, .label-text, .text').text().trim() ||
                      parent.text().trim();
        }

        options.push({
          value,
          text: labelText || value,
        });
      });

    return options;
  }
}
