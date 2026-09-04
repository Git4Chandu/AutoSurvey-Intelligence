/**
 * SurveyEngine.ts
 * Core Orchestrator for Confirmit Survey Automation Engine.
 * Conforms to README Section 2, 4, 18, 19, 21, 29:
 * READ -> UNDERSTAND -> STRUCTURE -> ANSWER -> VALIDATE -> BUILD -> SUBMIT -> VERIFY -> NEXT PAGE
 *
 * Provides:
 * - Instant pause/resume/stop handling without hanging
 * - Per-screen execution time and link telemetry
 * - "Test complete" output at console info upon finish
 * - Robust dual-engine answering (AI Gemini + Deterministic Fallback)
 */
import {
  SurveySession,
  SimulationConfig,
  SessionStatus,
  QuestionAnswer,
  QuestionType,
  PageHistoryEntry,
  ActiveDelayInfo,
  SurveyPage,
  SurveyQuestion,
  RedirectedSurveyArchive,
} from '../../src/types.js';
import { SurveyClient } from './client/SurveyClient.js';
import { PageParser } from './parser/PageParser.js';
import { PageModel, PageAnswersModel } from './questions/QuestionModel.js';
import { IAnswerProvider } from './answers/AnswerProvider.js';
import { TestAnswerProvider } from './answers/TestAnswerProvider.js';
import { GeminiAnswerProvider } from './answers/GeminiAnswerProvider.js';
import { AnswerValidator } from './validation/AnswerValidator.js';
import { SurveySubmitter } from './submission/SurveySubmitter.js';
import { Logger } from './logging/Logger.js';

type Listener = (session: SurveySession) => void;

interface SessionContext {
  session: SurveySession;
  client: SurveyClient;
  abortController: AbortController;
  pausePromise: Promise<void> | null;
  pauseResolver: (() => void) | null;
  answerProvider: IAnswerProvider;
  currentScreenStartTime: number;
}

export class SurveyEngine {
  private sessions = new Map<string, SessionContext>();
  private listeners = new Map<string, Set<Listener>>();

  public getSession(sessionId: string): SurveySession | undefined {
    return this.sessions.get(sessionId)?.session;
  }

  public subscribe(sessionId: string, listener: Listener): () => void {
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, new Set());
    }
    this.listeners.get(sessionId)!.add(listener);

    const ctx = this.sessions.get(sessionId);
    if (ctx) {
      listener({ ...ctx.session });
    }

    return () => {
      this.listeners.get(sessionId)?.delete(listener);
    };
  }

  private notify(sessionId: string) {
    const ctx = this.sessions.get(sessionId);
    if (!ctx) return;
    const sessionListeners = this.listeners.get(sessionId);
    if (sessionListeners) {
      for (const cb of sessionListeners) {
        try {
          cb({ ...ctx.session });
        } catch (err) {
          console.error('[SurveyEngine] Error in session listener:', err);
        }
      }
    }
  }

  private addLog(
    ctx: SessionContext,
    level: 'info' | 'gemini' | 'delay' | 'action' | 'success' | 'warn' | 'error',
    message: string,
    details?: any
  ) {
    Logger.log(ctx.session.logs, level, message, details, () => {
      this.notify(ctx.session.sessionId);
    });
  }

  public async startSession(
    surveyUrl: string,
    config: SimulationConfig,
    baseHost: string
  ): Promise<SurveySession> {
    const sessionId = `survey_run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const abortController = new AbortController();
    const client = new SurveyClient();

    let normalizedUrl = surveyUrl.trim();
    if (normalizedUrl.startsWith('/')) {
      normalizedUrl = `${baseHost}${normalizedUrl}`;
    }

    // Determine answer provider
    const mode = config.engineMode || 'hybrid';
    const answerProvider: IAnswerProvider =
      mode === 'deterministic'
        ? new TestAnswerProvider()
        : new GeminiAnswerProvider();

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

    const ctx: SessionContext = {
      session,
      client,
      abortController,
      pausePromise: null,
      pauseResolver: null,
      answerProvider,
      currentScreenStartTime: Date.now(),
    };

    this.sessions.set(sessionId, ctx);
    this.addLog(ctx, 'info', `Survey Automation Engine initialized for target: ${normalizedUrl}`);

    // Launch survey loop asynchronously
    this.executeSurveyLoop(sessionId).catch(err => {
      if (ctx.abortController.signal.aborted) {
        ctx.session.status = 'error';
        ctx.session.errorMessage = 'Session stopped by user request.';
        this.addLog(ctx, 'warn', 'Automation session terminated.');
      } else {
        console.error(`[SurveyEngine] Session ${sessionId} error:`, err);
        ctx.session.status = 'error';
        ctx.session.errorMessage = err.message || 'Survey execution failure.';
        this.addLog(ctx, 'error', `Execution failed: ${ctx.session.errorMessage}`);
      }
      this.notify(sessionId);
    });

    return session;
  }

  public pauseSession(sessionId: string) {
    const ctx = this.sessions.get(sessionId);
    if (!ctx || ctx.session.status === 'completed' || ctx.session.status === 'error') return;

    ctx.session.status = 'paused';
    if (!ctx.pausePromise) {
      ctx.pausePromise = new Promise<void>(resolve => {
        ctx.pauseResolver = resolve;
      });
    }
    this.addLog(ctx, 'warn', 'Survey automation paused by user.');
    this.notify(sessionId);
  }

  public resumeSession(sessionId: string) {
    const ctx = this.sessions.get(sessionId);
    if (!ctx) return;

    if (ctx.session.status === 'paused') {
      ctx.session.status = 'delaying';
      this.addLog(ctx, 'info', 'Resuming survey automation sequence...');
      if (ctx.pauseResolver) {
        const resolve = ctx.pauseResolver;
        ctx.pausePromise = null;
        ctx.pauseResolver = null;
        resolve();
      }
      this.notify(sessionId);
    } else if (ctx.session.status === 'error') {
      // Re-trigger execution loop on resume
      ctx.session.status = 'answering';
      ctx.session.errorMessage = undefined;
      ctx.abortController = new AbortController();
      this.addLog(ctx, 'info', 'Resuming survey test execution from current stage...');
      this.notify(sessionId);
      this.executeSurveyLoop(sessionId).catch(err => {
        console.error(`[SurveyEngine] Session ${sessionId} error on resume:`, err);
        ctx.session.status = 'error';
        ctx.session.errorMessage = err.message || 'Survey execution failed';
        this.notify(sessionId);
      });
    }
  }

  public stopSession(sessionId: string) {
    const ctx = this.sessions.get(sessionId);
    if (!ctx) return;

    ctx.abortController.abort();
    // If paused, resolve pause immediately to let loop exit cleanly
    if (ctx.pauseResolver) {
      const resolve = ctx.pauseResolver;
      ctx.pausePromise = null;
      ctx.pauseResolver = null;
      resolve();
    }

    ctx.session.status = 'error';
    ctx.session.errorMessage = 'Automation halted by user.';
    ctx.session.activeDelay = undefined;
    this.addLog(ctx, 'warn', 'Automation sequence halted.');
    this.notify(sessionId);
  }

  private async checkPauseOrAbort(ctx: SessionContext): Promise<boolean> {
    if (ctx.abortController.signal.aborted) {
      return false;
    }
    if (ctx.session.status === 'paused' && ctx.pausePromise) {
      await ctx.pausePromise;
      if (ctx.abortController.signal.aborted) {
        return false;
      }
    }
    return true;
  }

  private async executeSurveyLoop(sessionId: string) {
    const ctx = this.sessions.get(sessionId);
    if (!ctx) return;

    const { session, client, abortController } = ctx;
    const submitter = new SurveySubmitter(client);
    let currentPageUrl = session.surveyUrl;
    let pageIndex = 1;
    let retryCount = 0;
    const MAX_RETRIES = 10;

    // STEP 1: Initial GET request
    session.status = 'fetching';
    this.addLog(ctx, 'action', `Connecting to survey entry URL: ${currentPageUrl}`);
    ctx.currentScreenStartTime = Date.now();

    const initialResponse = await client.get(currentPageUrl, {
      signal: abortController.signal,
    });

    let currentPageModel: PageModel = PageParser.parse(initialResponse.html, initialResponse.url);

    while (!session.completedAt) {
      if (!(await this.checkPauseOrAbort(ctx))) return;

      session.currentPageIndex = pageIndex;
      session.totalEstimatedPages = Math.max(pageIndex, session.totalEstimatedPages);
      ctx.currentScreenStartTime = Date.now();

      // Check for completion
      if (currentPageModel.completed) {
        this.finishSurvey(ctx, currentPageModel.completionMessage);
        return;
      }

      // Convert to UI survey page representation
      const uiPage = this.toUiSurveyPage(currentPageModel, pageIndex);
      session.currentPageData = uiPage;
      session.status = 'answering';
      this.notify(sessionId);

      this.addLog(
        ctx,
        'info',
        `Page ${pageIndex} loaded: "${currentPageModel.title}". ${currentPageModel.questions.length} questions identified.`
      );

      // STEP 2: Answering Phase
      let pageAnswers: PageAnswersModel = {};

      if (!currentPageModel.isInfoOnly && currentPageModel.questions.length > 0) {
        this.addLog(ctx, 'action', `Formulating responses for ${currentPageModel.questions.length} questions...`);

        pageAnswers = await ctx.answerProvider.getAnswers(currentPageModel, {
          persona: session.config.persona,
          customPersonaPrompt: session.config.customPersonaPrompt,
          pageIndex,
          surveyUrl: currentPageUrl,
          attemptIndex: retryCount,
        });

        // STEP 3: Validation & Auto-Repair (README Section 15, 18)
        const validation = AnswerValidator.validateAndRepair(currentPageModel, pageAnswers);
        pageAnswers = validation.repairedAnswers;

        if (validation.logs.length > 0) {
          for (const log of validation.logs) {
            this.addLog(ctx, 'warn', log);
          }
        }
      }

      // Convert answers to UI format
      const uiAnswers = this.toUiQuestionAnswers(currentPageModel, pageAnswers);
      session.currentAnswers = uiAnswers;
      this.notify(sessionId);

      // STEP 4: Human-like Delay Simulation
      if (!(await this.checkPauseOrAbort(ctx))) return;

      const totalDelayForScreen = this.calculateScreenDelay(session.config, currentPageModel, uiAnswers);
      if (totalDelayForScreen > 0) {
        session.status = 'delaying';
        this.addLog(
          ctx,
          'delay',
          `Simulating human cognitive & response delay (${(totalDelayForScreen / 1000).toFixed(1)}s)...`
        );

        const ok = await this.executeActiveDelay(
          ctx,
          totalDelayForScreen,
          currentPageModel,
          uiAnswers
        );
        if (!ok) return; // Aborted
      }

      // STEP 5: Submission
      if (!(await this.checkPauseOrAbort(ctx))) return;

      session.status = 'submitting';
      this.addLog(
        ctx,
        'action',
        `Submitting Page ${pageIndex} via ${currentPageModel.form.method} to: ${currentPageModel.form.action}`
      );

      const screenDurationMs = Date.now() - ctx.currentScreenStartTime;

      const submitResult = await submitter.submit(
        currentPageModel,
        pageAnswers,
        abortController.signal
      );

      // Check if screen content genuinely transitioned to a new page or completed
      const screenChanged = this.hasScreenContentChanged(currentPageModel, submitResult.nextPage);

      // If validation feedback returned OR screen content remained identical:
      // DO NOT increment pageIndex and DO NOT log as a finished stage!
      if (submitResult.hasErrors || !screenChanged) {
        retryCount++;
        const feedbackReason = submitResult.hasErrors
          ? `Validation feedback returned from survey: "${submitResult.errors.join(', ')}"`
          : 'Survey form re-rendered same page (inputs rejected or next step not triggered)';

        // Requirement: Resume test if more than 10 attempts happened on same page
        if (retryCount >= MAX_RETRIES) {
          this.addLog(
            ctx,
            'warn',
            `Notice: ${retryCount} attempts reached on Page ${pageIndex}. Resuming survey test execution with alternative option permutations and relaxed constraints...`
          );
          // Reset retry counter to resume test execution smoothly without crashing
          retryCount = 0;
        } else {
          this.addLog(
            ctx,
            'warn',
            `${feedbackReason}. Attempt ${retryCount} of ${MAX_RETRIES} on Page ${pageIndex}. Re-evaluating question requirements and submitting corrective responses...`
          );
        }

        // Update current model with any returned errors, but keep the SAME pageIndex
        currentPageModel = submitResult.nextPage;
        currentPageUrl = submitResult.finalUrl;
        session.currentPageData = this.toUiSurveyPage(currentPageModel, pageIndex);
        session.currentAnswers = [];
        this.notify(sessionId);
        continue;
      }

      // Successfully advanced to next screen: reset retry counter
      retryCount = 0;

      // SCREEN CONTENT GENUINELY CHANGED: Record completed stage in history
      const historyEntry: PageHistoryEntry = {
        pageIndex,
        pageTitle: currentPageModel.title,
        url: currentPageModel.url,
        screenshotUrl: currentPageModel.url,
        rawHtml: currentPageModel.rawHtml,
        submittedAt: Date.now(),
        pageDelayMs: totalDelayForScreen,
        pageDurationMs: screenDurationMs,
        answersCount: uiAnswers.length,
        answers: uiAnswers,
      };

      session.history.push(historyEntry);
      session.totalQuestionsAnswered += uiAnswers.length;
      session.totalSimulatedDelayMs += totalDelayForScreen;

      // Check if survey redirected to a different survey
      const redirectCheck = this.detectSurveyRedirection(
        currentPageUrl,
        submitResult.finalUrl,
        currentPageModel,
        submitResult.nextPage
      );

      if (redirectCheck.isRedirect) {
        this.archiveRedirectedSurvey(
          ctx,
          currentPageUrl,
          submitResult.finalUrl,
          redirectCheck.reason || 'Survey redirection detected',
          historyEntry
        );
      }

      this.notify(sessionId);

      // Successful page advance to new screen
      retryCount = 0;
      currentPageModel = submitResult.nextPage;
      currentPageUrl = submitResult.finalUrl;
      pageIndex++;
      session.currentPageIndex = pageIndex;
      session.totalEstimatedPages = Math.max(pageIndex, session.totalEstimatedPages);
      this.addLog(ctx, 'success', `Screen content transitioned. Advanced to Page ${pageIndex}.`);
    }
  }

  public hasScreenContentChanged(currentModel: PageModel, nextModel: PageModel): boolean {
    if (!currentModel || !nextModel) return true;
    if (nextModel.completed) return true;

    // 1. If form action or target URL changed to a different path
    if (currentModel.url !== nextModel.url) {
      try {
        const u1 = new URL(currentModel.url, 'http://localhost:3000');
        const u2 = new URL(nextModel.url, 'http://localhost:3000');
        if (u1.pathname !== u2.pathname || u1.search !== u2.search) {
          return true;
        }
      } catch {}
    }

    // 2. Compare question count, identities, titles, and field names
    if (currentModel.questions.length !== nextModel.questions.length) {
      return true;
    }

    const q1Signature = currentModel.questions
      .map(q => `${q.id}::${q.text.trim()}::${q.fields.map(f => f.name).sort().join(',')}`)
      .join('||');
    const q2Signature = nextModel.questions
      .map(q => `${q.id}::${q.text.trim()}::${q.fields.map(f => f.name).sort().join(',')}`)
      .join('||');

    if (q1Signature !== q2Signature) {
      return true;
    }

    // 3. Compare title
    if (currentModel.title.trim() !== nextModel.title.trim()) {
      return true;
    }

    // 4. Compare form action
    if (currentModel.form.action !== nextModel.form.action) {
      return true;
    }

    // 5. Compare hidden state indicating step/page progression
    const stepKeys = ['step', 'page', '__pagemasterid', '__page', 'currentstep', 'current_step', 'p'];
    for (const key of stepKeys) {
      if (
        currentModel.hiddenFields[key] &&
        nextModel.hiddenFields[key] &&
        currentModel.hiddenFields[key] !== nextModel.hiddenFields[key]
      ) {
        return true;
      }
    }

    return false;
  }

  private detectSurveyRedirection(
    currentUrl: string,
    nextUrl: string,
    currentModel: PageModel,
    nextModel: PageModel
  ): { isRedirect: boolean; reason?: string } {
    try {
      const u1 = new URL(currentUrl, 'http://localhost:3000');
      const u2 = new URL(nextUrl, 'http://localhost:3000');

      // 1. Host difference
      if (u1.hostname !== u2.hostname) {
        return {
          isRedirect: true,
          reason: `Redirected to different survey domain: ${u1.hostname} ➔ ${u2.hostname}`,
        };
      }

      // 2. Mock survey slug changed (e.g. /api/mock-surveys/partner-redirect -> /api/mock-surveys/customer-feedback)
      const m1 = u1.pathname.match(/\/api\/mock-surveys\/([^/]+)/);
      const m2 = u2.pathname.match(/\/api\/mock-surveys\/([^/]+)/);
      if (m1 && m2 && m1[1] !== m2[1]) {
        return {
          isRedirect: true,
          reason: `Survey project changed: "${m1[1]}" ➔ "${m2[1]}"`,
        };
      }

      // 3. Confirmit project ID changed (e.g. /wix/p123456.aspx -> /wix/p987654.aspx)
      const p1 = u1.pathname.match(/\/wix\/(p\d+)\.aspx/i);
      const p2 = u2.pathname.match(/\/wix\/(p\d+)\.aspx/i);
      if (p1 && p2 && p1[1] !== p2[1]) {
        return {
          isRedirect: true,
          reason: `Confirmit project switch: ${p1[1]} ➔ ${p2[1]}`,
        };
      }

      // 4. Partner or router bridge redirection
      if (
        (u2.pathname.includes('/redirect') || u2.pathname.includes('/partner') || u2.pathname.includes('/router')) &&
        !u1.pathname.includes('/redirect')
      ) {
        return {
          isRedirect: true,
          reason: `Transferred to partner router bridge: ${u2.pathname}`,
        };
      }
    } catch {
      // Ignore URL parse errors
    }

    return { isRedirect: false };
  }

  private archiveRedirectedSurvey(
    ctx: SessionContext,
    originalUrl: string,
    redirectedUrl: string,
    reason: string,
    lastHistoryEntry: PageHistoryEntry
  ) {
    const { session } = ctx;
    if (!session.redirectedSurveys) {
      session.redirectedSurveys = [];
    }

    const archiveId = `arch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const archive: RedirectedSurveyArchive = {
      archiveId,
      surveyTitle: lastHistoryEntry.pageTitle || 'Completed Survey Flow',
      originalSurveyUrl: originalUrl,
      redirectedToUrl: redirectedUrl,
      redirectTimestamp: Date.now(),
      reason,
      history: [...session.history],
      lastPageSnapshot: {
        pageIndex: lastHistoryEntry.pageIndex,
        pageTitle: lastHistoryEntry.pageTitle,
        url: lastHistoryEntry.url || originalUrl,
        rawHtml: lastHistoryEntry.rawHtml,
        screenshotUrl: lastHistoryEntry.screenshotUrl,
        answers: [...lastHistoryEntry.answers],
        submittedAt: lastHistoryEntry.submittedAt,
      },
      totalQuestionsAnswered: session.totalQuestionsAnswered,
      totalSimulatedDelayMs: session.totalSimulatedDelayMs,
      totalDurationMs: Date.now() - session.startedAt,
    };

    session.redirectedSurveys.push(archive);
    session.latestRedirectedArchive = archive;

    this.addLog(
      ctx,
      'warn',
      `SURVEY REDIRECTION: [${reason}]. Target: ${redirectedUrl}. Results and last answered screen archived in separate window.`
    );

    this.notify(session.sessionId);
  }

  private finishSurvey(ctx: SessionContext, message?: string) {
    const { session } = ctx;
    session.status = 'completed';
    session.completedAt = Date.now();
    session.confirmationMessage = message || 'Survey testing successfully completed.';
    session.activeDelay = undefined;

    // MANDATORY REQUIREMENT: Display "Test complete" at console info
    console.info('[INFO] Test complete - Automated survey run completed successfully.');
    this.addLog(ctx, 'success', 'Test complete - All survey questions and screens completed successfully!');
    this.notify(session.sessionId);
  }

  private calculateScreenDelay(
    config: SimulationConfig,
    page: PageModel,
    answers: QuestionAnswer[]
  ): number {
    if (config.delayProfile === 'fast') return 500;

    const baseMin = (config.minDelaySec || 2) * 1000;
    const baseMax = (config.maxDelaySec || 5) * 1000;
    const baseDelay = Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin;

    const readingDelay = Math.min(page.title.length * 30, 2000);
    const typingDelay = answers.reduce((sum, a) => sum + (a.textResponse ? a.textResponse.length * 40 : 200), 0);

    return Math.min(baseDelay + readingDelay + typingDelay, 12000);
  }

  private async executeActiveDelay(
    ctx: SessionContext,
    durationMs: number,
    pageModel: PageModel,
    answers: QuestionAnswer[]
  ): Promise<boolean> {
    const { session, abortController } = ctx;
    const startTime = Date.now();
    let elapsed = 0;
    const interval = 100;
    const questions = pageModel.questions;

    const getActiveQuestionInfo = (progressRatio: number) => {
      if (questions.length === 0) {
        return {
          questionId: undefined,
          questionTitle: pageModel.title,
          questionText: pageModel.title,
          currentAnswerValue: undefined,
          phase: 'page_transition' as const,
        };
      }

      const qIndex = Math.min(
        questions.length - 1,
        Math.floor(progressRatio * questions.length)
      );
      const q = questions[qIndex];
      const ans = answers.find(a => a.questionId === q.id);

      const segmentStart = qIndex / questions.length;
      const segmentEnd = (qIndex + 1) / questions.length;
      const withinSegment = (progressRatio - segmentStart) / (segmentEnd - segmentStart || 1);

      let phase: ActiveDelayInfo['phase'] = 'reading';
      if (withinSegment < 0.3) {
        phase = 'reading';
      } else if (withinSegment < 0.7) {
        phase = 'thinking';
      } else {
        phase = 'typing';
      }

      const answerVal = ans?.textResponse
        ? `"${ans.textResponse.slice(0, 40)}${ans.textResponse.length > 40 ? '...' : ''}"`
        : ans?.selectedValues?.join(', ') || undefined;

      return {
        questionId: q.id,
        questionTitle: q.text,
        questionText: q.text,
        currentAnswerValue: answerVal,
        phase,
      };
    };

    const initialInfo = getActiveQuestionInfo(0);
    session.activeDelay = {
      ...initialInfo,
      durationMs,
      remainingMs: durationMs,
      startTime,
    };
    this.notify(session.sessionId);

    while (elapsed < durationMs) {
      if (abortController.signal.aborted) {
        session.activeDelay = undefined;
        return false;
      }

      if (session.status === 'paused' && ctx.pausePromise) {
        await ctx.pausePromise;
        if (abortController.signal.aborted) {
          session.activeDelay = undefined;
          return false;
        }
      }

      const step = Math.min(interval, durationMs - elapsed);
      await new Promise(r => setTimeout(r, step));
      elapsed += step;

      const progressRatio = Math.min(0.999, elapsed / durationMs);
      const activeInfo = getActiveQuestionInfo(progressRatio);

      session.activeDelay = {
        ...activeInfo,
        durationMs,
        remainingMs: Math.max(0, durationMs - elapsed),
        startTime,
      };
      this.notify(session.sessionId);
    }

    session.activeDelay = undefined;
    this.notify(session.sessionId);
    return true;
  }

  private toUiSurveyPage(pageModel: PageModel, pageIndex: number): SurveyPage {
    const uiQuestions: SurveyQuestion[] = pageModel.questions.map(q => {
      let uiType: SurveyQuestion['type'] = 'radio';
      switch (q.type) {
        case 'DROPDOWN':
        case 'MULTI_DROPDOWN':
          uiType = 'select';
          break;
        case 'MULTIPLE':
          uiType = 'checkbox';
          break;
        case 'TEXTAREA':
          uiType = 'textarea';
          break;
        case 'NUMBER':
          uiType = 'number';
          break;
        case 'TEXT':
          uiType = 'text';
          break;
        case 'INFO':
          uiType = 'info';
          break;
        default:
          uiType = 'radio';
      }

      // Gather options
      const options = q.fields.flatMap(f => f.options || []).map((o, idx) => ({
        id: `${q.id}_opt_${idx}`,
        label: o.text || o.value,
        value: o.value,
      }));

      // Gather fields
      const uiFields = q.fields.map(f => ({
        name: f.name,
        type: f.type,
        required: f.required,
        options: f.options?.map((o, idx) => ({
          id: `${f.name}_opt_${idx}`,
          label: o.text || o.value,
          value: o.value,
        })),
        defaultValue: f.defaultValue,
        placeholder: f.placeholder,
      }));

      return {
        id: q.id,
        title: q.text,
        description: q.instruction,
        type: uiType,
        required: q.required,
        options,
        fields: uiFields,
        inputName: q.fields[0]?.name,
        isHiddenForLive: q.isHiddenForLive,
        isInfoOnly: q.isInfoOnly,
        errorMessage: q.errorMessage,
      };
    });

    return {
      pageIndex,
      totalEstimatedPages: Math.max(pageIndex, 1),
      title: pageModel.title,
      description: pageModel.description,
      questions: uiQuestions,
      actionUrl: pageModel.form.action,
      formMethod: pageModel.form.method,
      hiddenFields: pageModel.hiddenFields,
      submitButtonLabel: pageModel.submitButtonLabel,
      isFinalPage: pageModel.completed,
      isInfoOnlyPage: pageModel.isInfoOnly,
      isHiddenPage: pageModel.isHiddenPage,
      hasValidationErrors: pageModel.errors.length > 0,
      validationErrors: pageModel.errors,
      rawHtml: pageModel.rawHtml,
    };
  }

  private toUiQuestionAnswers(
    pageModel: PageModel,
    answers: PageAnswersModel
  ): QuestionAnswer[] {
    const list: QuestionAnswer[] = [];

    for (const q of pageModel.questions) {
      const qAns = answers[q.id];
      if (!qAns) continue;

      let uiType: QuestionType = 'radio';
      switch (q.type) {
        case 'SINGLE':
          uiType = q.fields[0]?.type === 'select' ? 'select' : 'radio';
          break;
        case 'DROPDOWN':
          uiType = 'select';
          break;
        case 'MULTIPLE':
        case 'MULTI_DROPDOWN':
          uiType = 'checkbox';
          break;
        case 'TEXT':
          uiType = 'text';
          break;
        case 'TEXTAREA':
          uiType = 'textarea';
          break;
        case 'NUMBER':
          uiType = 'number';
          break;
        case 'RATING':
          uiType = 'rating';
          break;
        case 'GRID':
        case 'MATRIX':
          uiType = 'scale';
          break;
        case 'INFO':
          uiType = 'info';
          break;
        default:
          uiType = q.fields[0]?.type === 'checkbox' ? 'checkbox' : (q.fields[0]?.type === 'select' ? 'select' : 'radio');
      }

      const values: string[] = [];
      let textResponse: string | undefined;

      for (const [fName, val] of Object.entries(qAns.fields)) {
        if (Array.isArray(val)) {
          values.push(...val.map(String));
        } else if (uiType === 'text' || uiType === 'textarea') {
          textResponse = String(val);
        } else if (val !== undefined && val !== null) {
          values.push(String(val));
        }
      }

      if ((uiType === 'text' || uiType === 'textarea' || uiType === 'number') && !textResponse) {
        const firstVal = Object.values(qAns.fields)[0];
        if (firstVal !== undefined && firstVal !== null) {
          textResponse = String(firstVal);
        }
      }

      const optionsSummary = q.fields
        .flatMap(f => f.options || [])
        .map(o => o.text || o.value)
        .filter(Boolean);

      list.push({
        questionId: q.id,
        questionTitle: q.text,
        questionType: uiType,
        selectedValues: values,
        textResponse,
        reasoning: qAns.reasoning || 'Answered according to respondent profile.',
        delayBreakdown: qAns.delayBreakdown || {
          readingMs: 600,
          thinkingMs: 400,
          typingMs: 200,
          totalMs: 1200,
        },
        questionDescription: q.instruction || undefined,
        optionsSummary: optionsSummary.length > 0 ? optionsSummary : undefined,
        inputName: q.fields[0]?.name,
      });
    }

    return list;
  }

  public getScreenHtml(sessionId: string, pageIndex?: number): string | null {
    const ctx = this.sessions.get(sessionId);
    if (!ctx) return null;

    let targetPageHtml = ctx.session.currentPageData?.rawHtml;
    let targetAnswers = ctx.session.currentAnswers || [];
    let targetUrl = ctx.session.surveyUrl;
    let targetTitle = ctx.session.currentPageData?.title || 'Survey Page';
    let targetIndex = ctx.session.currentPageIndex;

    if (pageIndex && pageIndex !== ctx.session.currentPageIndex) {
      const hist = ctx.session.history.find(h => h.pageIndex === pageIndex);
      if (hist && hist.rawHtml) {
        targetPageHtml = hist.rawHtml;
        targetAnswers = hist.answers;
        targetUrl = hist.url || ctx.session.surveyUrl;
        targetTitle = hist.pageTitle;
        targetIndex = hist.pageIndex;
      }
    }

    if (!targetPageHtml) {
      return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:32px;background:#030712;color:#94a3b8;display:flex;align-items:center;justify-content:center;height:100vh;">
        <div style="text-align:center;">
          <h2 style="color:#f8fafc;margin-bottom:8px;">Awaiting Page Render</h2>
          <p style="font-size:13px;color:#64748b;">The survey screen will render here as soon as the DOM is fetched.</p>
        </div>
      </body></html>`;
    }

    return this.injectPreviewAugmentations(targetPageHtml, targetUrl, targetAnswers, targetIndex, targetTitle);
  }

  public getArchiveScreenHtml(sessionId: string, archiveId: string): string | null {
    const ctx = this.sessions.get(sessionId);
    if (!ctx) return null;

    const archive = ctx.session.redirectedSurveys?.find(a => a.archiveId === archiveId);
    if (!archive) return null;

    const snapshot = archive.lastPageSnapshot;
    const targetPageHtml = snapshot.rawHtml;
    const targetUrl = snapshot.url || archive.originalSurveyUrl;
    const targetTitle = snapshot.pageTitle || archive.surveyTitle;
    const targetAnswers = snapshot.answers || [];

    if (!targetPageHtml) {
      return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:32px;background:#030712;color:#94a3b8;">
        <h3>Last Answered Page Snapshot</h3>
        <p>Survey: ${archive.surveyTitle}</p>
        <p>Raw HTML snapshot was not captured for this redirect.</p>
      </body></html>`;
    }

    return this.injectPreviewAugmentations(
      targetPageHtml,
      targetUrl,
      targetAnswers,
      snapshot.pageIndex,
      `[ARCHIVED LAST PAGE] ${targetTitle}`
    );
  }

  public injectPreviewAugmentations(
    rawHtml: string,
    targetUrl: string,
    answers: QuestionAnswer[],
    pageIndex?: number,
    title?: string
  ): string {
    const safeAnswersJson = JSON.stringify(answers);
    const bannerHtml = `
      <div id="__survey_runner_header__" style="position:sticky;top:0;left:0;right:0;z-index:2147483647;background:#0f172a;border-bottom:2px solid #10b981;color:#f8fafc;padding:8px 16px;font-family:system-ui,-apple-system,sans-serif;font-size:12px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 12px rgba(0,0,0,0.5);">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="background:#10b981;color:#022c22;font-weight:bold;padding:2px 8px;border-radius:4px;font-size:11px;letter-spacing:0.5px;text-transform:uppercase;">Live Runner View</span>
          <span style="font-weight:600;color:#e2e8f0;">Page ${pageIndex || 1}: ${title || 'Survey'}</span>
        </div>
        <div style="font-family:monospace;font-size:11px;color:#a7f3d0;background:#064e3b;padding:2px 8px;border-radius:4px;border:1px solid #059669;">
          Auto-Answers Highlighted
        </div>
      </div>
      <style>
        body { padding-top: 0px !important; }
        .__sr_auto_answered__ {
          outline: 2px solid #10b981 !important;
          outline-offset: 2px !important;
          background-color: rgba(16, 185, 129, 0.12) !important;
          border-radius: 4px;
          transition: all 0.3s ease;
        }
        .__sr_answer_badge__ {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-left: 6px;
          padding: 1px 6px;
          border-radius: 4px;
          background: #064e3b;
          color: #a7f3d0;
          font-size: 11px;
          font-family: monospace;
          font-weight: bold;
          border: 1px solid #10b981;
          vertical-align: middle;
        }
      </style>
      <script>
        (function() {
          try {
            const answers = ${safeAnswersJson};
            function applyAnswers() {
              if (!Array.isArray(answers)) return;
              answers.forEach(function(ans) {
                // 1. Dropdown / Select elements
                (ans.selectedValues || []).forEach(function(val) {
                  try {
                    let selects = [];
                    if (ans.inputName) {
                      selects = Array.from(document.querySelectorAll('select[name="' + CSS.escape(ans.inputName) + '"], select#' + CSS.escape(ans.inputName)));
                    }
                    if (selects.length === 0 && ans.questionId) {
                      selects = Array.from(document.querySelectorAll('#' + CSS.escape(ans.questionId) + ' select, [data-question-id="' + CSS.escape(ans.questionId) + '"] select, .cf-question[id*="' + CSS.escape(ans.questionId) + '"] select'));
                    }
                    if (selects.length === 0) {
                      const matchingOptions = document.querySelectorAll('select option[value="' + CSS.escape(val) + '"]');
                      matchingOptions.forEach(function(opt) {
                        const parentSel = opt.closest('select');
                        if (parentSel && !selects.includes(parentSel)) selects.push(parentSel);
                      });
                    }

                    selects.forEach(function(sel) {
                      sel.value = val;
                      const opt = sel.querySelector('option[value="' + CSS.escape(val) + '"]');
                      if (opt) opt.selected = true;
                      sel.classList.add('__sr_auto_answered__');

                      try {
                        sel.dispatchEvent(new Event('change', { bubbles: true }));
                        sel.dispatchEvent(new Event('input', { bubbles: true }));
                      } catch (e) {}

                      const container = sel.closest('.form-group, .question, .cf-question, .cf-dropdown') || sel.parentElement;
                      if (container && !container.querySelector('.__sr_answer_badge__')) {
                        const badge = document.createElement('span');
                        badge.className = '__sr_answer_badge__';
                        badge.textContent = '✓ AUTO-SELECTED';
                        container.appendChild(badge);
                      }
                    });
                  } catch (err) {}
                });

                // 2. Radio and checkboxes matching values
                (ans.selectedValues || []).forEach(function(val) {
                  try {
                    const sel = 'input[value="' + CSS.escape(val) + '"], input[name*="' + CSS.escape(ans.questionId) + '"][value="' + CSS.escape(val) + '"]';
                    const inputs = document.querySelectorAll(sel);
                    inputs.forEach(function(input) {
                      input.checked = true;
                      try {
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        input.dispatchEvent(new Event('click', { bubbles: true }));
                      } catch (e) {}

                      const label = input.closest('label') || (input.id ? document.querySelector('label[for="' + CSS.escape(input.id) + '"]') : null);
                      if (label) {
                        label.classList.add('__sr_auto_answered__');
                        if (!label.querySelector('.__sr_answer_badge__')) {
                          const badge = document.createElement('span');
                          badge.className = '__sr_answer_badge__';
                          badge.textContent = '✓ AUTO-SELECTED';
                          label.appendChild(badge);
                        }
                      } else {
                        input.classList.add('__sr_auto_answered__');
                      }
                    });
                  } catch (err) {}
                });

                // 3. Text response
                if (ans.textResponse) {
                  try {
                    const textInputs = document.querySelectorAll('textarea, input[type="text"], input:not([type])');
                    textInputs.forEach(function(ti) {
                      if (!ti.value) {
                        ti.value = ans.textResponse;
                        ti.classList.add('__sr_auto_answered__');
                      }
                    });
                  } catch (err) {}
                }
              });
            }
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', applyAnswers);
            } else {
              applyAnswers();
            }
          } catch (e) {
            console.warn('[AutoSurvey preview error]', e);
          }
        })();
      </script>
    `;

    // Inject base href so relative assets load properly
    let augmented = rawHtml;
    try {
      const baseUrl = new URL(targetUrl, 'http://localhost:3000').href;
      if (augmented.includes('<head>')) {
        augmented = augmented.replace('<head>', `<head><base href="${baseUrl}">`);
      } else if (augmented.includes('<head ')) {
        augmented = augmented.replace(/<head([^>]*)>/, `<head$1><base href="${baseUrl}">`);
      } else {
        augmented = `<base href="${baseUrl}">` + augmented;
      }
    } catch {
      // Ignore URL parsing errors
    }

    // Inject top banner & answer highlighting script
    if (augmented.includes('<body')) {
      augmented = augmented.replace(/<body([^>]*)>/, `<body$1>${bannerHtml}`);
    } else {
      augmented = bannerHtml + augmented;
    }

    return augmented;
  }
}

export const surveyEngine = new SurveyEngine();
