import { PlatformConfig } from './types.js';

export const ConfirmitPlatform: PlatformConfig = {
  id: 'confirmit',
  name: 'ConfirmIT / Forsta',
  urlPatterns: ['confirmit.com', 'survey.us.confirmit', 'survey.eu.confirmit', 'forsta.com', '/wix/p'],
  useBrowser: true,
  cssFieldPattern: /\{[^}]*display\s*:\s*none/i,
  hiddenRadioFallback: true,
  submitSelectors: [
    '.cf-navigation-button--next',
    '[data-role="next"]',
    'input[type="submit"]',
    'button[type="submit"]',
    'button:last-of-type',
  ],
};
