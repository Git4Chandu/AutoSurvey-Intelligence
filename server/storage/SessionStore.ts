import fs from 'node:fs';
import path from 'node:path';
import { SurveySession } from '../../src/types.js';

export interface StoredSessionSummary {
  sessionId: string;
  surveyUrl: string;
  status: SurveySession['status'];
  startedAt: number;
  completedAt?: number;
  currentPageIndex: number;
  totalQuestionsAnswered: number;
  totalSimulatedDelayMs: number;
}

interface SessionStore_Data {
  sessions: Record<string, SurveySession>;
}

export class SessionStore {
  private readonly filePath: string;
  private data: SessionStore_Data;

  constructor(dbPath = path.join(process.cwd(), 'data', 'autosurvey-sessions.json')) {
    this.filePath = dbPath;
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    if (fs.existsSync(dbPath)) {
      try {
        this.data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      } catch {
        this.data = { sessions: {} };
      }
    } else {
      this.data = { sessions: {} };
    }
  }

  private persist(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  save(session: SurveySession): void {
    this.data.sessions[session.sessionId] = session;
    this.persist();
  }

  get(sessionId: string): SurveySession | undefined {
    return this.data.sessions[sessionId];
  }

  list(limit = 100): StoredSessionSummary[] {
    const cap = Math.max(1, Math.min(limit, 500));
    return Object.values(this.data.sessions)
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, cap)
      .map((s) => ({
        sessionId: s.sessionId,
        surveyUrl: s.surveyUrl,
        status: s.status,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        currentPageIndex: s.currentPageIndex,
        totalQuestionsAnswered: s.totalQuestionsAnswered,
        totalSimulatedDelayMs: s.totalSimulatedDelayMs,
      }));
  }

  close(): void {
    // no-op: file writes are synchronous, nothing to close
  }
}
