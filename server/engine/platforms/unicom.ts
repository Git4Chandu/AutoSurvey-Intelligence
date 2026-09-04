import { PlatformConfig } from './types.js';

export const UnicomPlatform: PlatformConfig = {
  id: 'unicom',
  name: 'Unicom Intelligence',
  urlPatterns: ['unicom', 'unipark.com', 'questback.com'],
  useBrowser: true,
  hiddenRadioFallback: false,
  submitSelectors: [
    'input[type="submit"]',
    'button[type="submit"]',
    '.next-button',
    'a.next',
    'button.next',
  ],
};
