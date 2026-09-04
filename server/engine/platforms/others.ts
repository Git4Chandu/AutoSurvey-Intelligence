import { PlatformConfig } from './types.js';

export const OthersPlatform: PlatformConfig = {
  id: 'others',
  name: 'Generic / Other',
  urlPatterns: [],
  useBrowser: true,
  hiddenRadioFallback: false,
  submitSelectors: [
    'input[type="submit"]',
    'button[type="submit"]',
    'button[data-next]',
    'button.next',
    'a.next',
    'button:last-of-type',
  ],
};
