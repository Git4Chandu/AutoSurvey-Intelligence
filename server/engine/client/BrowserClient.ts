/**
 * BrowserClient.ts
 * Headless-Chrome transport layer using Puppeteer.
 * Replaces plain fetch() for real external surveys so that survey
 * JavaScript (VSL token generation, cfApi init, jQuery logic) fully
 * executes before we read or submit the page.
 */
import puppeteer, { Browser, Page } from 'puppeteer';

export interface BrowserNavigateResult {
  html: string;
  url: string;
  status: number;
}

export class BrowserClient {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async launch(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-background-timer-throttling',
      ],
    });
    this.page = await this.browser.newPage();
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await this.page.setViewport({ width: 1280, height: 900 });
    // Accept all cookies / consent dialogs silently
    await this.page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  }

  private get pg(): Page {
    if (!this.page) throw new Error('BrowserClient not launched — call launch() first');
    return this.page;
  }

  /**
   * Navigate to a URL, wait for JS to fully execute (including VSL token
   * generation), then return the fully-rendered HTML.
   */
  async navigate(url: string): Promise<BrowserNavigateResult> {
    let httpStatus = 200;
    try {
      const response = await this.pg.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 45000,
      });
      httpStatus = response?.status() ?? 200;
    } catch (err: any) {
      // networkidle2 timeout is acceptable — page content is still usable
      if (!err?.message?.includes('timeout')) throw err;
    }

    // Allow deferred JS (cfApi init, VSL token injection) to settle
    await new Promise(r => setTimeout(r, 1200));

    const html = await this.pg.content();
    const finalUrl = this.pg.url();
    return { html, url: finalUrl, status: httpStatus };
  }

  /**
   * Fill visible question inputs with AI-provided answers, then click the
   * survey's submit / Next button. The browser keeps all hidden fields
   * (VSL token, revision, state) intact — we only touch the answer fields.
   */
  async fillAndSubmit(
    fieldValues: Record<string, string | string[]>,
    platformSubmitSelectors?: string[]
  ): Promise<BrowserNavigateResult> {
    // NOTE: No named inner functions inside evaluate() — tsx/esbuild injects
    // __name() helpers for them which are undefined in the browser sandbox.
    await this.pg.evaluate((fields: Record<string, string | string[]>) => {
      for (const [name, value] of Object.entries(fields)) {
        // Inline escaping — avoids a named helper that esbuild would wrap with __name
        const en = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

        if (Array.isArray(value)) {
          for (let i = 0; i < value.length; i++) {
            const ev = value[i].replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            const el = document.querySelector(
              'input[name="' + en + '"][value="' + ev + '"]'
            ) as HTMLInputElement | null;
            if (el) {
              el.checked = true;
              const jq = (window as any).jQuery || (window as any).$;
              if (jq) { jq(el).prop('checked', true).trigger('click').trigger('change'); }
              else {
                el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
              }
            } else {
              // Confirmit custom widget: inject into #{name}_hidden container inside the form
              const container = document.getElementById(en + '_hidden');
              if (container) {
                if (!container.querySelector('input[name="' + en + '"][value="' + ev + '"]')) {
                  const inp = document.createElement('input');
                  inp.type = 'hidden'; inp.name = en; inp.value = ev;
                  container.appendChild(inp);
                }
              }
            }
          }
        } else {
          const ev = (value as string).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          const radio = document.querySelector(
            'input[type="radio"][name="' + en + '"][value="' + ev + '"]'
          ) as HTMLInputElement | null;
          if (radio) {
            radio.checked = true;
            const jq = (window as any).jQuery || (window as any).$;
            if (jq) { jq(radio).prop('checked', true).trigger('click').trigger('change'); }
            else {
              radio.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              radio.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } else {
            // Confirmit custom widget: inject directly into #{name}_hidden container inside the form.
            // Confirmit's server only checks the POST body — bypassing the cf-radio widget is safe.
            // Some Confirmit fields have an "_input" suffix on the visible text input (autocomplete/age grid)
            // while the actual form field and hidden container use the name without "_input".
            const baseName = en.replace(/_input$/, '');
            let container = document.getElementById(en + '_hidden') || document.getElementById(baseName + '_hidden');
            if (container) {
              const actualName = container.id.replace(/_hidden$/, '');
              const old = container.querySelector('input[name="' + actualName + '"]');
              if (old) old.remove();
              const inp = document.createElement('input');
              inp.type = 'hidden'; inp.name = actualName; inp.value = ev;
              container.appendChild(inp);
            } else {
              // Fallback 2: Confirmit grid/matrix — container ID differs from field name.
              // Extract row number from field name (e.g. "1" from "mobile_S3xM_1_input"),
              // inject into any empty cf-page__question-hidden-fields using its base ID
              // as the actual form field name prefix (e.g. gS3_1 into gS3_hidden).
              const rowMatch = en.match(/_(\d+)(?:_input)?$/);
              const row = rowMatch ? rowMatch[1] : '';
              const emptyContainers = Array.from(
                document.querySelectorAll('.cf-page__question-hidden-fields:empty')
              ) as HTMLElement[];
              let injectedIntoGrid = false;
              for (let ci = 0; ci < emptyContainers.length; ci++) {
                const c = emptyContainers[ci];
                const cBase = c.id.replace(/_hidden$/, '');
                const fieldName = row ? cBase + '_' + row : cBase;
                const hidden = document.createElement('input');
                hidden.type = 'hidden'; hidden.name = fieldName; hidden.value = ev;
                c.appendChild(hidden);
                injectedIntoGrid = true;
              }
              if (!injectedIntoGrid) {
                // Fallback 3: generic text/select for non-Confirmit surveys
                const inp = document.querySelector(
                  'input[name="' + en + '"]:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]),' +
                  'textarea[name="' + en + '"],' +
                  'select[name="' + en + '"]'
                ) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
                if (inp) {
                  (inp as any).value = value as string;
                  inp.dispatchEvent(new Event('input', { bubbles: true }));
                  inp.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }
            }
          }
        }
      }
    }, fieldValues);

    // DEBUG: log hidden container state to understand Confirmit matrix question field names
    const _injDiag = await this.pg.evaluate(() => {
      const allHidden = Array.from(document.querySelectorAll('[id$="_hidden"]')) as HTMLElement[];
      return allHidden.slice(0, 20).map(el => ({
        id: el.id,
        inputs: Array.from(el.querySelectorAll('input')).map(i => ({ name: (i as HTMLInputElement).name, value: (i as HTMLInputElement).value, type: (i as HTMLInputElement).type }))
      }));
    });
    console.log('[BrowserClient] Hidden containers after fill:', JSON.stringify(_injDiag));

    // Pre-submit: select the first available option for any hidden radio group
    // that has no option checked (e.g. Confirmit RVID routing fields).
    // For real respondent links, Confirmit's JS already pre-selects these;
    // for test links without respondent-variable data, they stay empty and
    // block form submission server-side. Using getBoundingClientRect() to detect
    // hidden groups avoids named inner functions (which esbuild wraps with __name).
    await this.pg.evaluate(() => {
      const allRadios = Array.from(document.querySelectorAll('input[type="radio"]'));
      const seen: Record<string, boolean> = {};
      for (let i = 0; i < allRadios.length; i++) {
        const r = allRadios[i] as HTMLInputElement;
        if (!r.name || seen[r.name]) continue;
        seen[r.name] = true;
        const group = Array.from(
          document.querySelectorAll('input[type="radio"][name="' + r.name + '"]')
        ) as HTMLInputElement[];
        let anyChecked = false;
        for (let j = 0; j < group.length; j++) { if (group[j].checked) { anyChecked = true; break; } }
        if (anyChecked) continue;
        // Check if the first radio is visually hidden (tracking / routing field)
        const rect = group[0].getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0 && group.length > 0) {
          group[0].checked = true;
          group[0].dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });

    // Click submit and wait for the browser to navigate to the next page.
    // Use Puppeteer's native page.click() so real CDP mouse events fire,
    // which triggers jQuery / Confirmit click handlers (evaluate btn.click()
    // dispatches a synthetic click that some frameworks ignore).
    const submitSelectors = platformSubmitSelectors ?? [
      '.cf-navigation-button--next',
      '[data-role="next"]',
      'input[type="submit"]',
      'button[type="submit"]',
      'button:last-of-type',
    ];

    let clicked = false;
    for (const sel of submitSelectors) {
      try {
        const el = await this.pg.$(sel);
        if (el) {
          await Promise.all([
            this.pg.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 }),
            this.pg.click(sel),
          ]);
          clicked = true;
          break;
        }
      } catch (err: any) {
        if (err?.message?.includes('timeout')) { clicked = true; break; }
        // selector not found — try next
      }
    }

    if (!clicked) {
      // Fallback: submit the form via JS
      try {
        await Promise.all([
          this.pg.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
          this.pg.evaluate(() => {
            const form = document.querySelector<HTMLFormElement>('form');
            if (form) form.submit();
          }),
        ]);
      } catch (err: any) {
        if (!err?.message?.includes('timeout')) throw err;
      }
    }

    await new Promise(r => setTimeout(r, 800));
    const html = await this.pg.content();
    const finalUrl = this.pg.url();
    return { html, url: finalUrl, status: 200 };
  }

  async close(): Promise<void> {
    try { await this.browser?.close(); } catch {}
    this.browser = null;
    this.page = null;
  }

  isLaunched(): boolean {
    return this.browser !== null;
  }
}
