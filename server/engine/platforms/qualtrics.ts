import { PlatformConfig } from './types.js';

export const QualtricsPlatform: PlatformConfig = {
  id: 'qualtrics',
  name: 'Qualtrics XM',
  urlPatterns: ['qualtrics.com', 'az1.qualtrics', 'yul1.qualtrics', 'iad1.qualtrics', 'ca1.qualtrics'],
  useBrowser: true,
  hiddenRadioFallback: false,
  submitSelectors: [
    '#NextButton',
    'button#NextButton',
    '.NavigationButton.NextButton',
    'button[data-qa="next-button"]',
    'input[type="submit"]',
    'button[type="submit"]',
  ],
};
