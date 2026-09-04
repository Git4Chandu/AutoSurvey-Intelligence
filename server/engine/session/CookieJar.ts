/**
 * CookieJar.ts
 * Manages HTTP session cookies across survey pages, matching domain and path constraints.
 */
export class CookieJar {
  private cookies: Map<string, { value: string; domain?: string; path?: string }> = new Map();

  constructor(initialCookies?: Record<string, string>) {
    if (initialCookies) {
      for (const [k, v] of Object.entries(initialCookies)) {
        this.cookies.set(k.trim(), { value: v.trim(), path: '/' });
      }
    }
  }

  /**
   * Parse Set-Cookie header string or array of strings from response
   */
  public parseSetCookie(setCookieHeader: string | string[] | undefined | null) {
    if (!setCookieHeader) return;

    const list = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : [setCookieHeader];

    for (const raw of list) {
      if (!raw || typeof raw !== 'string') continue;
      const parts = raw.split(';').map(p => p.trim());
      const first = parts[0];
      if (!first) continue;

      const equalIndex = first.indexOf('=');
      if (equalIndex <= 0) continue;

      const key = first.slice(0, equalIndex).trim();
      const value = first.slice(equalIndex + 1).trim();

      let domain: string | undefined;
      let path: string | undefined;

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const [attrName, attrVal] = part.split('=').map(s => s.trim());
        if (attrName.toLowerCase() === 'domain') domain = attrVal;
        if (attrName.toLowerCase() === 'path') path = attrVal;
      }

      this.cookies.set(key, { value, domain, path: path || '/' });
    }
  }

  /**
   * Get Cookie header string to send in HTTP request
   */
  public getCookieHeader(targetUrl?: string): string {
    const pairs: string[] = [];
    for (const [key, item] of this.cookies.entries()) {
      pairs.push(`${key}=${item.value}`);
    }
    return pairs.join('; ');
  }

  /**
   * Return a shallow object dictionary of all cookies
   */
  public toObject(): Record<string, string> {
    const obj: Record<string, string> = {};
    for (const [k, v] of this.cookies.entries()) {
      obj[k] = v.value;
    }
    return obj;
  }

  public set(key: string, value: string) {
    this.cookies.set(key.trim(), { value: value.trim(), path: '/' });
  }

  public get(key: string): string | undefined {
    return this.cookies.get(key)?.value;
  }

  public clear() {
    this.cookies.clear();
  }
}
