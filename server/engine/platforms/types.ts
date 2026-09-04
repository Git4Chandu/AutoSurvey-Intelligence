export type PlatformId =
  | 'confirmit'
  | 'decipher'
  | 'qualtrics'
  | 'unicom'
  | 'cmix'
  | 'google-sheets'
  | 'others';

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  urlPatterns: string[];
  /** Whether this platform requires headless browser (Puppeteer) execution */
  useBrowser: boolean;
  /** Regex to detect and skip internal/tracking CSS fields by question text */
  cssFieldPattern?: RegExp;
  /** If true, auto-select first option of hidden radio groups before submit */
  hiddenRadioFallback?: boolean;
  /** Ordered list of CSS selectors to try when clicking Next/Submit */
  submitSelectors?: string[];
}
