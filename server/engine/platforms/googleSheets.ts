import { PlatformConfig } from './types.js';

export const GoogleSheetsPlatform: PlatformConfig = {
  id: 'google-sheets',
  name: 'Google Forms / Sheets',
  urlPatterns: ['docs.google.com/forms', 'forms.google.com', 'forms.gle'],
  useBrowser: true,
  hiddenRadioFallback: false,
  submitSelectors: [
    '[data-shuffle-seed] ~ div button',
    'div[role="button"][jsname="OCpkoe"]',
    'div[jsname="P1ekSe"]',
    'input[type="submit"]',
    'button[type="submit"]',
  ],
};
