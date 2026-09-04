import { PlatformConfig } from './types.js';
import { ConfirmitPlatform } from './confirmit.js';
import { DecipherPlatform } from './decipher.js';
import { QualtricsPlatform } from './qualtrics.js';
import { UnicomPlatform } from './unicom.js';
import { CmixPlatform } from './cmix.js';
import { GoogleSheetsPlatform } from './googleSheets.js';
import { OthersPlatform } from './others.js';

const PLATFORM_REGISTRY: PlatformConfig[] = [
  ConfirmitPlatform,
  DecipherPlatform,
  QualtricsPlatform,
  UnicomPlatform,
  CmixPlatform,
  GoogleSheetsPlatform,
  OthersPlatform,
];

export function detectPlatform(url: string): PlatformConfig {
  const lower = url.toLowerCase();
  for (const platform of PLATFORM_REGISTRY) {
    if (platform.id === 'others') continue;
    if (platform.urlPatterns.some(p => lower.includes(p.toLowerCase()))) {
      return platform;
    }
  }
  return OthersPlatform;
}

export { PLATFORM_REGISTRY };
export type { PlatformConfig };
