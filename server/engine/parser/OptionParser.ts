/**
 * OptionParser.ts
 * Extracts available options (values, labels, scores) from HTML elements.
 */
import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import { FieldOption } from '../questions/QuestionModel.js';

export function isSelectPlaceholder(opt?: { value?: string; text?: string }): boolean {
  if (!opt) return true;
  const val = (opt.value || '').trim().toLowerCase();
  const txt = (opt.text || '').trim().toLowerCase();

  // Empty values
  if (val === '') return true;

  // Common placeholder values
  if (['-1', 'none', 'null', 'select', 'choose', 'default', 'placeholder', '--', '0'].includes(val)) {
    // If text looks like a prompt rather than a legitimate answer
    if (
      txt.includes('select') ||
      txt.includes('choose') ||
      txt.includes('pick') ||
      txt.startsWith('--') ||
      txt.startsWith('-') ||
      txt.includes('please') ||
      txt.includes('option') ||
      txt === ''
    ) {
      return true;
    }
  }

  // Text contains prompt instructions like "Select an option", "Choose one", "-- Select --", "Please select"
  if (/^(--|\.\.\.)?\s*(please\s+)?(select|choose|pick)\b/i.test(txt)) {
    return true;
  }

  return false;
}

export class OptionParser {
  /**
   * Extract options from a <select> element
   */
  public static parseSelectOptions($: CheerioAPI, selectEl: Element): FieldOption[] {
    const options: FieldOption[] = [];
    $(selectEl)
      .find('option')
      .each((_, opt) => {
        const rawVal = $(opt).attr('value');
        const text = $(opt).text().trim();
        const isDisabled = $(opt).attr('disabled') !== undefined;
        // In standard HTML, if value attribute is missing, it defaults to the text
        const value = rawVal !== undefined ? rawVal : text;

        if (value !== undefined) {
          options.push({
            value: value,
            text: text || value,
            isExclusive: isDisabled,
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
