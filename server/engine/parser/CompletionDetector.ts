/**
 * CompletionDetector.ts
 * Detects whether the current survey page is a terminal or completion page.
 */
import type { CheerioAPI } from 'cheerio';

export class CompletionDetector {
  private static completionPhrases = [
    'thank you for completing',
    'thank you for participating',
    'thank you for your time',
    'your response has been recorded',
    'your responses have been recorded',
    'you have successfully completed',
    'survey has ended',
    'survey is now complete',
    'survey complete',
    'survey is finished',
    'test complete',
    'the survey has been completed',
    'all questions answered',
    'has concluded',
  ];

  public static isCompleted($: CheerioAPI, url: string, rawHtml: string): { completed: boolean; message?: string } {
    const lowerHtml = rawHtml.toLowerCase();
    const lowerUrl = url.toLowerCase();

    // 1. URL checks
    if (
      lowerUrl.includes('complete') ||
      lowerUrl.includes('finish') ||
      lowerUrl.includes('thankyou') ||
      lowerUrl.includes('thank_you') ||
      lowerUrl.includes('terminate') ||
      lowerUrl.includes('termreport')
    ) {
      return {
        completed: true,
        message: 'Survey completion or terminal URL detected: ' + url,
      };
    }

    // 2. Check for completion phrases in headings, body, or text
    const headings = $('h1, h2, h3, .title, .cf-question__title, .completed-message').text().toLowerCase();
    for (const phrase of this.completionPhrases) {
      if (headings.includes(phrase)) {
        return {
          completed: true,
          message: $('h1, h2, h3, .completed-message').first().text().trim() || phrase,
        };
      }
    }

    // 3. If there is no form or submit button AND a body completion phrase matches
    const formCount = $('form').length;
    const submitCount = $('input[type="submit"], button[type="submit"], button:contains("Submit"), button:contains("Done"), button:contains("Finish")').length;

    if (formCount === 0 || submitCount === 0) {
      for (const phrase of this.completionPhrases) {
        if (lowerHtml.includes(phrase)) {
          return {
            completed: true,
            message: 'Target survey has reached terminal step: ' + phrase,
          };
        }
      }
    }

    return { completed: false };
  }
}
