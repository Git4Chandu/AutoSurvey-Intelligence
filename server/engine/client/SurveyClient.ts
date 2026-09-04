/**
 * SurveyClient.ts
 * Pure HTTP communication layer for Confirmit & survey targets.
 * Maintains User-Agent, Referer, redirects, and CookieJar.
 */
import { CookieJar } from '../session/CookieJar.js';

export interface HttpResponse {
  status: number;
  ok: boolean;
  html: string;
  url: string;
  headers: Record<string, string>;
}

export interface RequestOptions {
  referer?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export class SurveyClient {
  private cookieJar: CookieJar;
  private userAgent: string;
  private lastUrl: string = '';

  constructor(cookieJar?: CookieJar, userAgent?: string) {
    this.cookieJar = cookieJar || new CookieJar();
    this.userAgent =
      userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  }

  public getCookieJar(): CookieJar {
    return this.cookieJar;
  }

  public getLastUrl(): string {
    return this.lastUrl;
  }

  /**
   * Perform HTTP GET request
   */
  public async get(url: string, options?: RequestOptions): Promise<HttpResponse> {
    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      ...options?.headers,
    };

    const cookieHeader = this.cookieJar.getCookieHeader(url);
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    if (options?.referer || this.lastUrl) {
      headers['Referer'] = options?.referer || this.lastUrl;
    }

    const timeoutMs = options?.timeoutMs || 30000;
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const combinedSignal = options?.signal
      ? anySignal([options.signal, timeoutSignal])
      : timeoutSignal;

    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: combinedSignal,
      redirect: 'follow',
    });

    this.extractCookiesFromResponse(res);
    const html = await res.text();
    this.lastUrl = res.url || url;

    return {
      status: res.status,
      ok: res.ok,
      html,
      url: this.lastUrl,
      headers: Object.fromEntries(res.headers.entries()),
    };
  }

  /**
   * Perform HTTP POST request
   */
  public async post(
    url: string,
    body: URLSearchParams | FormData | string,
    options?: RequestOptions
  ): Promise<HttpResponse> {
    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      ...options?.headers,
    };

    const cookieHeader = this.cookieJar.getCookieHeader(url);
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    if (options?.referer || this.lastUrl) {
      headers['Referer'] = options?.referer || this.lastUrl;
    }

    const timeoutMs = options?.timeoutMs || 30000;
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const combinedSignal = options?.signal
      ? anySignal([options.signal, timeoutSignal])
      : timeoutSignal;

    const bodyString = typeof body === 'string' ? body : body.toString();

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: bodyString,
      signal: combinedSignal,
      redirect: 'follow',
    });

    this.extractCookiesFromResponse(res);
    const html = await res.text();
    this.lastUrl = res.url || url;

    return {
      status: res.status,
      ok: res.ok,
      html,
      url: this.lastUrl,
      headers: Object.fromEntries(res.headers.entries()),
    };
  }

  private extractCookiesFromResponse(res: Response) {
    const rawHeaders = res.headers as any;
    if (typeof rawHeaders.getSetCookie === 'function') {
      const setCookies = rawHeaders.getSetCookie();
      if (Array.isArray(setCookies) && setCookies.length > 0) {
        this.cookieJar.parseSetCookie(setCookies);
        return;
      }
    }
    const single = res.headers.get('set-cookie');
    if (single) {
      this.cookieJar.parseSetCookie(single);
    }
  }
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort();
      return controller.signal;
    }
    s.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}
