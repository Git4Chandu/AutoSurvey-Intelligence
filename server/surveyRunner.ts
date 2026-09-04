import {
  SurveySession,
  SimulationConfig,
  LogEntry,
  QuestionAnswer,
  ActiveDelayInfo,
  PageHistoryEntry,
  SurveyPage,
  SurveyQuestion
} from '../src/types.js';
import { parseSurveyHtml, ParseResult } from './surveyParser.js';
import { generateIntelligentAnswers } from './gemini.js';

type Listener = (session: SurveySession) => void;

class SurveyRunnerManager {
  private sessions = new Map<string, SurveySession>();
  private listeners = new Map<string, Set<Listener>>();
  private pauseResolvers = new Map<string, () => void>();
  private abortControllers = new Map<string, AbortController>();
  private cookieJars = new Map<string, Record<string, string>>();

  public getSession(sessionId: string): SurveySession | undefined {
    return this.sessions.get(sessionId);
  }

  public subscribe(sessionId: string, listener: Listener): () => void {
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, new Set());
    }
    this.listeners.get(sessionId)!.add(listener);

    const session = this.sessions.get(sessionId);
    if (session) {
      listener(session);
    }

    return () => {
      this.listeners.get(sessionId)?.delete(listener);
    };
  }

  private notify(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const sessionListeners = this.listeners.get(sessionId);
    if (sessionListeners) {
      for (const cb of sessionListeners) {
        try {
          cb({ ...session });
        } catch (err) {
          console.error("Error in session listener callback:", err);
        }
      }
    }
  }

  private addLog(
    session: SurveySession,
    level: LogEntry['level'],
    message: string,
    details?: any
  ) {
    const log: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      level,
      message,
      details,
    };
    session.logs.push(log);
    // Keep max 200 logs to avoid excessive memory
    if (session.logs.length > 200) {
      session.logs.shift();
    }
    this.notify(session.sessionId);
  }

  public async startSession(
    surveyUrl: string,
    config: SimulationConfig,
    baseHost: string
  ): Promise<SurveySession> {
    const sessionId = `survey_run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const abortController = new AbortController();
    this.abortControllers.set(sessionId, abortController);
    this.cookieJars.set(sessionId, {});

    // Resolve relative or local URLs if starting with '/'
    let normalizedUrl = surveyUrl.trim();
    if (normalizedUrl.startsWith('/')) {
      normalizedUrl = `${baseHost}${normalizedUrl}`;
    }

    const session: SurveySession = {
      sessionId,
      surveyUrl: normalizedUrl,
      status: 'fetching',
      currentPageIndex: 1,
      totalEstimatedPages: 1,
      currentPageData: null,
      currentAnswers: [],
      history: [],
      logs: [],
      totalQuestionsAnswered: 0,
      totalSimulatedDelayMs: 0,
      startedAt: Date.now(),
      config,
    };

    this.sessions.set(sessionId, session);
    this.addLog(session, 'info', `Initialized automated survey run for URL: ${normalizedUrl}`);

    // Launch run in background
    this.runSurveyLoop(sessionId, normalizedUrl).catch(err => {
      console.error(`Session ${sessionId} loop failed:`, err);
      session.status = 'error';
      session.errorMessage = err.message || 'Unexpected execution error';
      this.addLog(session, 'error', `Execution failed: ${session.errorMessage}`);
      this.notify(sessionId);
    });

    return session;
  }

  public pauseSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status === 'completed' || session.status === 'error') return;
    session.status = 'paused';
    this.addLog(session, 'warn', `Automation sequence paused by user.`);
    this.notify(sessionId);
  }

  public resumeSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'paused') return;
    session.status = 'delaying';
    this.addLog(session, 'info', `Resuming automation sequence...`);
    const resolver = this.pauseResolvers.get(sessionId);
    if (resolver) {
      this.pauseResolvers.delete(sessionId);
      resolver();
    }
    this.notify(sessionId);
  }

  public stopSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const controller = this.abortControllers.get(sessionId);
    if (controller) {
      controller.abort();
    }
    session.status = 'error';
    session.errorMessage = 'Session terminated by user request.';
    session.activeDelay = undefined;
    this.addLog(session, 'warn', `Automation halted by user.`);
    this.notify(sessionId);
  }

  private async waitWithPauseCheck(
    sessionId: string,
    durationMs: number,
    phase: ActiveDelayInfo['phase'],
    questionTitle?: string
  ): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const controller = this.abortControllers.get(sessionId);
    const startTime = Date.now();
    let elapsed = 0;

    session.activeDelay = {
      questionTitle,
      phase,
      durationMs,
      remainingMs: durationMs,
      startTime,
    };
    this.notify(sessionId);

    const interval = 100;
    while (elapsed < durationMs) {
      if (controller?.signal.aborted) {
        session.activeDelay = undefined;
        return false;
      }

      if (session.status === 'paused') {
        await new Promise<void>(resolve => {
          this.pauseResolvers.set(sessionId, resolve);
        });
        if (controller?.signal.aborted) {
          session.activeDelay = undefined;
          return false;
        }
      }

      const step = Math.min(interval, durationMs - elapsed);
      await new Promise(r => setTimeout(r, step));
      elapsed = Date.now() - startTime;

      if (session.activeDelay) {
        session.activeDelay.remainingMs = Math.max(0, durationMs - elapsed);
      }
      this.notify(sessionId);
    }

    session.totalSimulatedDelayMs += durationMs;
    session.activeDelay = undefined;
    this.notify(sessionId);
    return true;
  }

  private async fetchPage(sessionId: string, url: string): Promise<{ html: string; status: number; finalUrl: string }> {
    const controller = this.abortControllers.get(sessionId);
    const cookies = this.cookieJars.get(sessionId) || {};
    const cookieHeader = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');

    const res = await fetch(url, {
      signal: controller?.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(cookieHeader ? { 'Cookie': cookieHeader } : {})
      }
    });

    this.extractCookiesFromResponse(sessionId, res);

    const html = await res.text();
    return { html, status: res.status, finalUrl: res.url || url };
  }

  private async submitForm(
    sessionId: string,
    actionUrl: string,
    method: 'GET' | 'POST',
    fields: Record<string, string | string[]>,
    refererUrl: string
  ): Promise<{ html: string; status: number; finalUrl: string }> {
    const controller = this.abortControllers.get(sessionId);
    const cookies = this.cookieJars.get(sessionId) || {};
    const cookieHeader = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');

    const urlParams = new URLSearchParams();
    for (const [key, value] of Object.entries(fields)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          urlParams.append(key, item);
        }
      } else if (value !== undefined && value !== null) {
        urlParams.append(key, String(value));
      }
    }

    let targetUrl = actionUrl;
    const reqInit: RequestInit = {
      signal: controller?.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': refererUrl,
        ...(cookieHeader ? { 'Cookie': cookieHeader } : {})
      }
    };

    if (method === 'GET') {
      const parsed = new URL(actionUrl);
      for (const [k, v] of urlParams.entries()) {
        parsed.searchParams.append(k, v);
      }
      targetUrl = parsed.toString();
      reqInit.method = 'GET';
    } else {
      reqInit.method = 'POST';
      reqInit.headers = {
        ...reqInit.headers,
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      reqInit.body = urlParams.toString();
    }

    const res = await fetch(targetUrl, reqInit);
    this.extractCookiesFromResponse(sessionId, res);

    const html = await res.text();
    return { html, status: res.status, finalUrl: res.url || targetUrl };
  }

  private extractCookiesFromResponse(sessionId: string, res: globalThis.Response) {
    const cookies = this.cookieJars.get(sessionId) || {};
    const setCookies: string[] = typeof (res.headers as any).getSetCookie === 'function'
      ? (res.headers as any).getSetCookie()
      : [res.headers.get('set-cookie')].filter(Boolean) as string[];

    for (const raw of setCookies) {
      if (!raw) continue;
      const parts = raw.split(';');
      if (parts[0] && parts[0].includes('=')) {
        const eqIdx = parts[0].indexOf('=');
        const k = parts[0].slice(0, eqIdx).trim();
        const v = parts[0].slice(eqIdx + 1).trim();
        if (k) cookies[k] = v;
      }
    }
    this.cookieJars.set(sessionId, cookies);
  }

  private calculateDelays(
    questionTitle: string,
    optionsText: string,
    answerText: string,
    config: SimulationConfig
  ): { readingMs: number; thinkingMs: number; typingMs: number; totalMs: number } {
    const readingWpm = config.readingWpm || config.readingSpeedWpm || 240;
    const typingCpm = config.typingCpm || 200;

    const totalWords = (questionTitle + ' ' + optionsText).trim().split(/\s+/).length;
    const baseReadingMs = (totalWords / readingWpm) * 60 * 1000;
    const readingJitter = 0.85 + Math.random() * 0.35;
    const readingMs = Math.max(800, Math.round(baseReadingMs * readingJitter));

    const minT = config.minThinkingDelayMs || (config.minDelaySec ? config.minDelaySec * 1000 : 1000);
    const maxT = config.maxThinkingDelayMs || (config.maxDelaySec ? config.maxDelaySec * 1000 : 3500);
    const thinkingMs = Math.round(minT + Math.random() * Math.max(500, maxT - minT));

    let typingMs = 0;
    if (answerText && answerText.length > 0) {
      const charCount = answerText.length;
      const baseTypingMs = (charCount / typingCpm) * 60 * 1000;
      const typingJitter = 0.8 + Math.random() * 0.4;
      typingMs = Math.max(400, Math.round(baseTypingMs * typingJitter));
    }

    return {
      readingMs,
      thinkingMs,
      typingMs,
      totalMs: readingMs + thinkingMs + typingMs,
    };
  }

  private async runSurveyLoop(sessionId: string, initialUrl: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    let currentUrl = initialUrl;
    let currentHtml: string | null = null;
    let pageStep = 1;
    const maxSteps = 25; // safety cap
    const attemptedEmptySubmissions = new Set<number>();

    while (pageStep <= maxSteps) {
      session.currentPageIndex = pageStep;

      let fetchResult: { html: string; status: number; finalUrl: string };
      if (currentHtml) {
        fetchResult = { html: currentHtml, status: 200, finalUrl: currentUrl };
        currentHtml = null; // consumed
      } else {
        session.status = 'fetching';
        this.addLog(session, 'info', `Navigating to survey step ${pageStep}: ${currentUrl}`);
        this.notify(sessionId);

        try {
          fetchResult = await this.fetchPage(sessionId, currentUrl);
        } catch (err: any) {
          session.status = 'error';
          session.errorMessage = `Network request failed: ${err.message}`;
          this.addLog(session, 'error', session.errorMessage);
          this.notify(sessionId);
          return;
        }
      }

      // Parse the page HTML
      session.status = 'parsing';
      this.addLog(session, 'info', `Analyzing DOM content (${fetchResult.html.length} bytes)...`);
      const parseResult: ParseResult = parseSurveyHtml(fetchResult.html, fetchResult.finalUrl);

      // 1. Check completion screen
      if (parseResult.isCompleted) {
        session.status = 'completed';
        session.completedAt = Date.now();
        session.confirmationMessage = parseResult.completionMessage || 'Survey has been successfully completed!';
        this.addLog(session, 'success', `🎉 Survey Completed! Confirmation: "${session.confirmationMessage}"`);
        this.notify(sessionId);
        return;
      }

      if (!parseResult.page) {
        session.status = 'error';
        session.errorMessage = `Could not detect active survey form or questions on the page. The survey might require prior authentication or JavaScript-only execution.`;
        this.addLog(session, 'error', session.errorMessage);
        this.notify(sessionId);
        return;
      }

      let surveyPage: SurveyPage = parseResult.page;
      session.currentPageData = surveyPage;
      session.totalEstimatedPages = Math.max(session.totalEstimatedPages, pageStep + (surveyPage.isFinalPage ? 0 : 1));

      // 2. CHECK IF THIS IS AN INFORMATIONAL / INSTRUCTIONAL PAGE (No questions needing answers)
      const hasInputQuestions = surveyPage.questions.some(q => !q.isInfoOnly);
      if (surveyPage.isInfoOnlyPage || !hasInputQuestions) {
        this.addLog(
          session,
          'info',
          `Detected informational page: "${surveyPage.title}". No questions require manual answers. Reading content before auto-advancing...`
        );
        session.status = 'delaying';

        // Simulate reading the informational text
        const infoText = (surveyPage.title + ' ' + (surveyPage.description || '') + ' ' + (surveyPage.questions[0]?.title || '')).trim();
        const wordCount = infoText.split(/\s+/).length;
        const readingMs = Math.max(1800, Math.min(4500, Math.round((wordCount / 220) * 60 * 1000)));

        this.addLog(session, 'delay', `Simulating human reading time for informational text: ${(readingMs / 1000).toFixed(1)}s`);
        const okInfoReading = await this.waitWithPauseCheck(sessionId, readingMs, 'reading', surveyPage.title);
        if (!okInfoReading) return;

        // Auto-advance by submitting hidden fields
        session.status = 'submitting';
        this.addLog(session, 'action', `Auto-advancing past informational page to ${surveyPage.actionUrl}...`);
        this.notify(sessionId);

        let submitResult: { html: string; status: number; finalUrl: string };
        try {
          submitResult = await this.submitForm(
            sessionId,
            surveyPage.actionUrl,
            surveyPage.formMethod,
            surveyPage.hiddenFields,
            fetchResult.finalUrl
          );
        } catch (err: any) {
          session.status = 'error';
          session.errorMessage = `Failed to advance informational page: ${err.message}`;
          this.addLog(session, 'error', session.errorMessage);
          this.notify(sessionId);
          return;
        }

        // Record history
        session.history.push({
          pageIndex: pageStep,
          pageTitle: surveyPage.title,
          answers: [],
          submittedAt: Date.now(),
          pageDelayMs: readingMs,
        });

        const postSubmitParse = parseSurveyHtml(submitResult.html, submitResult.finalUrl);
        if (postSubmitParse.isCompleted) {
          session.status = 'completed';
          session.completedAt = Date.now();
          session.confirmationMessage = postSubmitParse.completionMessage || 'Survey completed successfully!';
          this.addLog(session, 'success', `🎉 Survey Completed! Confirmation: "${session.confirmationMessage}"`);
          this.notify(sessionId);
          return;
        }

        currentUrl = submitResult.finalUrl;
        currentHtml = submitResult.html;
        pageStep++;
        continue;
      }

      // 3. CHECK IF PAGE READS AS "HIDDEN FOR LIVE" OR "HIDDEN TITLE"
      // User requirement: "When page reads as hidden for live or Hidden title, then those pages can be submitted without answering. If any error is raised the should select or provide the answer to move forward."
      const isHiddenPageOrQuestions = surveyPage.isHiddenPage || surveyPage.questions.some(q => q.isHiddenForLive);

      if (isHiddenPageOrQuestions && !surveyPage.hasValidationErrors && !attemptedEmptySubmissions.has(pageStep)) {
        attemptedEmptySubmissions.add(pageStep);
        this.addLog(
          session,
          'info',
          `Detected page with 'Hidden for live' / 'Hidden title' question(s) ("${surveyPage.title}"). Per testing protocol, attempting auto-submit without answering...`
        );

        session.status = 'delaying';
        const briefHesitationMs = Math.round(1200 + Math.random() * 800);
        await this.waitWithPauseCheck(sessionId, briefHesitationMs, 'thinking', surveyPage.title);

        session.status = 'submitting';
        this.addLog(session, 'action', `Submitting hidden page with empty answers to check if advance is accepted...`);
        this.notify(sessionId);

        let hiddenSubmitResult: { html: string; status: number; finalUrl: string };
        try {
          hiddenSubmitResult = await this.submitForm(
            sessionId,
            surveyPage.actionUrl,
            surveyPage.formMethod,
            surveyPage.hiddenFields,
            fetchResult.finalUrl
          );
        } catch (err: any) {
          this.addLog(session, 'warn', `Empty submission request error: ${err.message}. Switching to intelligent answer formulation...`);
          hiddenSubmitResult = { html: fetchResult.html, status: 500, finalUrl: fetchResult.finalUrl };
        }

        const postHiddenParse = parseSurveyHtml(hiddenSubmitResult.html, hiddenSubmitResult.finalUrl);

        // Check if an error was raised on submission
        const errorRaised =
          postHiddenParse.page?.hasValidationErrors ||
          (postHiddenParse.page?.validationErrors && postHiddenParse.page.validationErrors.length > 0) ||
          hiddenSubmitResult.html.includes('Please select an answer') ||
          hiddenSubmitResult.html.includes('One or more questions require further input');

        if (errorRaised) {
          const errors = postHiddenParse.page?.validationErrors?.length
            ? postHiddenParse.page.validationErrors
            : ['Please select an answer to move forward.'];

          this.addLog(
            session,
            'warn',
            `Validation error detected on hidden question: "${errors.join('; ')}". Intelligence activating: selecting required answer to move forward...`
          );

          // Update page with validation errors and proceed to intelligent answering
          surveyPage = postHiddenParse.page || surveyPage;
          surveyPage.hasValidationErrors = true;
          surveyPage.validationErrors = errors;
          session.currentPageData = surveyPage;
          fetchResult = hiddenSubmitResult; // update current html context
        } else {
          // No error was raised! Submission accepted!
          this.addLog(session, 'success', `Hidden page submitted successfully without answering. Advancing...`);

          session.history.push({
            pageIndex: pageStep,
            pageTitle: surveyPage.title,
            answers: [],
            submittedAt: Date.now(),
            pageDelayMs: briefHesitationMs,
          });

          if (postHiddenParse.isCompleted) {
            session.status = 'completed';
            session.completedAt = Date.now();
            session.confirmationMessage = postHiddenParse.completionMessage || 'Survey completed!';
            this.addLog(session, 'success', `🎉 Survey Completed! Confirmation: "${session.confirmationMessage}"`);
            this.notify(sessionId);
            return;
          }

          currentUrl = hiddenSubmitResult.finalUrl;
          currentHtml = hiddenSubmitResult.html;
          pageStep++;
          continue;
        }
      }

      // 4. STANDARD QUESTIONS ANSWERING (OR RECOVERING FROM VALIDATION ERROR)
      const activeQuestions = surveyPage.questions.filter(q => !q.isInfoOnly);
      this.addLog(
        session,
        'info',
        `Evaluating ${activeQuestions.length} question(s) on page "${surveyPage.title}"${surveyPage.hasValidationErrors ? ' (resolving validation errors)' : ''}...`
      );

      session.status = 'answering';
      this.addLog(session, 'gemini', `Invoking Gemini Intelligence to formulate human answers (${session.config.persona})...`);
      this.notify(sessionId);

      const intelligentAnswers = await generateIntelligentAnswers(
        surveyPage.title,
        surveyPage.description || '',
        activeQuestions,
        session.config,
        session.history.flatMap(h => h.answers),
        surveyPage.validationErrors
      );

      this.addLog(session, 'gemini', `Formulated responses for ${intelligentAnswers.length} question(s).`);

      // Simulate human behavior per question
      session.status = 'delaying';
      const pageAnswers: QuestionAnswer[] = [];
      let pageTotalDelayMs = 0;

      for (let i = 0; i < activeQuestions.length; i++) {
        const question = activeQuestions[i];
        const ans = intelligentAnswers.find(a => a.questionId === question.id);
        const selectedValues = ans?.selectedValues || [];
        const textResponse = ans?.textResponse;
        const reasoning = ans?.reasoning || 'Selected based on respondent profile.';

        const optionsText = (question.options || []).map(o => o.label).join(' ');
        const delays = this.calculateDelays(
          question.title,
          optionsText,
          textResponse || selectedValues.join(' '),
          session.config
        );

        pageTotalDelayMs += delays.totalMs;

        // 1. Reading delay
        this.addLog(
          session,
          'delay',
          `[Question ${i + 1}/${activeQuestions.length}] Reading: ${(delays.readingMs / 1000).toFixed(1)}s for "${question.title.slice(0, 55)}..."`
        );
        const okReading = await this.waitWithPauseCheck(sessionId, delays.readingMs, 'reading', question.title);
        if (!okReading) return;

        // 2. Thinking & hesitation delay
        this.addLog(
          session,
          'delay',
          `[Question ${i + 1}/${activeQuestions.length}] Hesitation: ${(delays.thinkingMs / 1000).toFixed(1)}s`
        );
        const okThinking = await this.waitWithPauseCheck(sessionId, delays.thinkingMs, 'thinking', question.title);
        if (!okThinking) return;

        // 3. Typing delay (if applicable)
        if (delays.typingMs > 0) {
          this.addLog(
            session,
            'delay',
            `[Question ${i + 1}/${activeQuestions.length}] Keystrokes: ${(delays.typingMs / 1000).toFixed(1)}s`
          );
          const okTyping = await this.waitWithPauseCheck(sessionId, delays.typingMs, 'typing', question.title);
          if (!okTyping) return;
        }

        const questionAnswer: QuestionAnswer = {
          questionId: question.id,
          questionTitle: question.title,
          questionType: question.type,
          selectedValues,
          textResponse,
          reasoning,
          delayBreakdown: delays,
          questionDescription: question.description,
          optionsSummary: question.options?.map(o => o.label).filter(Boolean),
          inputName: question.inputName || question.fields?.[0]?.name,
        };

        pageAnswers.push(questionAnswer);
        session.currentAnswers = [...pageAnswers];
        session.totalQuestionsAnswered += 1;

        this.addLog(
          session,
          'action',
          `Answered "${question.title.slice(0, 35)}...": [${selectedValues.join(', ') || textResponse}] — ${reasoning}`
        );
        this.notify(sessionId);
      }

      // Review hesitation before submitting
      const reviewDelayMs = Math.round(1500 + Math.random() * 1500);
      this.addLog(session, 'delay', `Simulating final page review before submitting: ${(reviewDelayMs / 1000).toFixed(1)}s`);
      const okReview = await this.waitWithPauseCheck(sessionId, reviewDelayMs, 'page_transition', 'Reviewing responses');
      if (!okReview) return;

      // Auto-advance & submit
      if (!session.config.autoAdvance) {
        session.status = 'paused';
        this.addLog(session, 'warn', `Auto-advance is paused by configuration. Waiting for manual trigger to submit page.`);
        this.notify(sessionId);
        return;
      }

      session.status = 'submitting';
      this.addLog(session, 'action', `Submitting Step ${pageStep} responses to ${surveyPage.actionUrl}...`);
      this.notify(sessionId);

      // Build payload
      const payload: Record<string, string | string[]> = { ...surveyPage.hiddenFields };
      for (const ans of pageAnswers) {
        const q = surveyPage.questions.find(item => item.id === ans.questionId);
        const fieldName = q?.inputName || ans.questionId;

        if (q?.type === 'checkbox') {
          payload[fieldName] = ans.selectedValues;
        } else if (ans.textResponse !== undefined && (q?.type === 'text' || q?.type === 'textarea' || q?.type === 'email' || q?.type === 'number')) {
          payload[fieldName] = ans.textResponse;
        } else if (ans.selectedValues.length > 0) {
          payload[fieldName] = ans.selectedValues[0];
        }
      }

      let submitResult: { html: string; status: number; finalUrl: string };
      try {
        submitResult = await this.submitForm(
          sessionId,
          surveyPage.actionUrl,
          surveyPage.formMethod,
          payload,
          fetchResult.finalUrl
        );
      } catch (err: any) {
        session.status = 'error';
        session.errorMessage = `Submission request failed: ${err.message}`;
        this.addLog(session, 'error', session.errorMessage);
        this.notify(sessionId);
        return;
      }

      // Record to history
      const historyEntry: PageHistoryEntry = {
        pageIndex: pageStep,
        pageTitle: surveyPage.title,
        answers: pageAnswers,
        submittedAt: Date.now(),
        pageDelayMs: pageTotalDelayMs + reviewDelayMs,
      };
      session.history.push(historyEntry);

      // Check if returned HTML indicates completion
      const postSubmitParse = parseSurveyHtml(submitResult.html, submitResult.finalUrl);
      if (postSubmitParse.isCompleted) {
        session.status = 'completed';
        session.completedAt = Date.now();
        session.confirmationMessage = postSubmitParse.completionMessage || 'Survey has been submitted and completed!';
        this.addLog(session, 'success', `🎉 Survey auto-advance finished! Confirmation: "${session.confirmationMessage}"`);
        this.notify(sessionId);
        return;
      }

      // Check if returned page has validation errors
      if (postSubmitParse.page?.hasValidationErrors) {
        this.addLog(
          session,
          'warn',
          `Validation error encountered upon submission: "${postSubmitParse.page.validationErrors?.join('; ')}". Intelligence will re-evaluate and rectify.`
        );
        currentUrl = submitResult.finalUrl;
        currentHtml = submitResult.html;
        continue;
      }

      // If next page is found
      if (postSubmitParse.page) {
        this.addLog(session, 'info', `Auto-advancing to next page (Step ${pageStep + 1}): "${postSubmitParse.page.title}"...`);
        currentUrl = submitResult.finalUrl;
        currentHtml = submitResult.html;
        pageStep++;
        continue;
      }

      // If no more questions and no error, treat as completed
      session.status = 'completed';
      session.completedAt = Date.now();
      session.confirmationMessage = 'Submission accepted. All survey sections completed.';
      this.addLog(session, 'success', `Survey run completed successfully.`);
      this.notify(sessionId);
      return;
    }

    session.status = 'completed';
    session.completedAt = Date.now();
    this.addLog(session, 'info', `Reached maximum page steps (${maxSteps}). Concluding session.`);
    this.notify(sessionId);
  }
}

export const surveyRunner = new SurveyRunnerManager();
