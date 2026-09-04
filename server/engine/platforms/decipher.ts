import { PlatformConfig } from './types.js';

export const DecipherPlatform: PlatformConfig = {
  id: 'decipher',
  name: 'Decipher / FocusVision',
  urlPatterns: ['decipherinc.com', 'focusvision.com', 'survey.decipher', 'v2.decipherinc'],
  useBrowser: true,
  hiddenRadioFallback: false,
  submitSelectors: [
    'button.submit',
    'input[type="submit"]',
    'button[type="submit"]',
    '.nav-button.next',
    'a.next',
  ],
};
