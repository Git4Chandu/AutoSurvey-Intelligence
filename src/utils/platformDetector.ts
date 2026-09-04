export type PlatformId =
  | 'confirmit'
  | 'decipher'
  | 'qualtrics'
  | 'unicom'
  | 'cmix'
  | 'google-sheets'
  | 'others';

export interface Platform {
  id: PlatformId;
  name: string;
  shortName: string;
  demoUrl: string;
  description: string;
  urlPatterns: string[];
}

export const PLATFORMS: Platform[] = [
  {
    id: 'confirmit',
    name: 'ConfirmIT',
    shortName: 'ConfirmIT',
    demoUrl: '/api/mock-surveys/confirmit-simulation',
    description: 'Forsta/Confirmit surveys with VSL tokens, RVID routing fields, and jQuery widget handling.',
    urlPatterns: ['confirmit.com', 'survey.us.confirmit', 'survey.eu.confirmit', 'forsta.com', '/wix/p'],
  },
  {
    id: 'decipher',
    name: 'Decipher',
    shortName: 'Decipher',
    demoUrl: '/api/mock-surveys/developer-tools',
    description: 'Decipher/FocusVision surveys with skip logic, advanced piping, and quota control.',
    urlPatterns: ['decipherinc.com', 'focusvision.com', 'survey.decipher', 'v2.decipherinc'],
  },
  {
    id: 'qualtrics',
    name: 'Qualtrics',
    shortName: 'Qualtrics',
    demoUrl: '/api/mock-surveys/customer-feedback',
    description: 'Qualtrics XM surveys with embedded data, loop & merge, and branching logic.',
    urlPatterns: ['qualtrics.com', 'az1.qualtrics', 'yul1.qualtrics', 'iad1.qualtrics', 'ca1.qualtrics'],
  },
  {
    id: 'unicom',
    name: 'Unicom',
    shortName: 'Unicom',
    demoUrl: '/api/mock-surveys/workplace-culture',
    description: 'Unicom Intelligence (formerly SPSS Data Collection) surveys with complex routing.',
    urlPatterns: ['unicom', 'unipark.com', 'questback.com'],
  },
  {
    id: 'cmix',
    name: 'Cmix',
    shortName: 'Cmix',
    demoUrl: '/api/mock-surveys/partner-redirect',
    description: 'Cmix (Critical Mix) panel survey platform with respondent tracking.',
    urlPatterns: ['cmix.com', 'criticalmix.com', 'pureprofile.com'],
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    shortName: 'G-Forms',
    demoUrl: '/api/mock-surveys/customer-feedback',
    description: 'Google Forms data collection integrated with Sheets for analysis.',
    urlPatterns: ['docs.google.com/forms', 'forms.google.com', 'forms.gle'],
  },
  {
    id: 'others',
    name: 'Others',
    shortName: 'Others',
    demoUrl: '/api/mock-surveys/developer-tools',
    description: 'Generic or custom survey platforms using standard HTML forms.',
    urlPatterns: [],
  },
];

export function detectPlatform(url: string): Platform {
  const lower = url.toLowerCase();
  for (const platform of PLATFORMS) {
    if (platform.id === 'others') continue;
    if (platform.urlPatterns.some(p => lower.includes(p.toLowerCase()))) {
      return platform;
    }
  }
  return PLATFORMS[PLATFORMS.length - 1]; // 'others'
}
