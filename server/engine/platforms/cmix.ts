import { PlatformConfig } from './types.js';

export const CmixPlatform: PlatformConfig = {
  id: 'cmix',
  name: 'Cmix (Critical Mix)',
  urlPatterns: ['cmix.com', 'criticalmix.com', 'pureprofile.com'],
  useBrowser: true,
  hiddenRadioFallback: false,
  submitSelectors: [
    'input[type="submit"]',
    'button[type="submit"]',
    '.btn-next',
    'button.next',
  ],
};
