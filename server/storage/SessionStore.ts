import Database from 'better-sqlite3';
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

export class SessionStore {
  private readonly db: Database.Database;

  constructor(dbPath = path.join(process.cwd(), 'data', 'autosurvey.sqlite')) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS survey_sessions (
        session_id TEXT PRIMARY KEY,
        survey_url TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        current_page_index INTEGER NOT NULL,
        total_questions_answered INTEGER NOT NULL,
        total_simulated_delay_ms INTEGER NOT NULL,
        session_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_survey_sessions_started_at
        ON survey_sessions (started_at DESC);
    `);
  }

  save(session: SurveySession): void {
    this.db.prepare(`
      INSERT INTO survey_sessions (
        session_id, survey_url, status, started_at, completed_at,
        current_page_index, total_questions_answered, total_simulated_delay_ms,
        session_json, updated_at
      ) VALUES (
        @sessionId, @surveyUrl, @status, @startedAt, @completedAt,
        @currentPageIndex, @totalQuestionsAnswered, @totalSimulatedDelayMs,
        @sessionJson, @updatedAt
      )
      ON CONFLICT(session_id) DO UPDATE SET
        survey_url = excluded.survey_url,
        status = excluded.status,
        completed_at = excluded.completed_at,
        current_page_index = excluded.current_page_index,
        total_questions_answered = excluded.total_questions_answered,
        total_simulated_delay_ms = excluded.total_simulated_delay_ms,
        session_json = excluded.session_json,
        updated_at = excluded.updated_at
    `).run({
      sessionId: session.sessionId,
      surveyUrl: session.surveyUrl,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt ?? null,
      currentPageIndex: session.currentPageIndex,
      totalQuestionsAnswered: session.totalQuestionsAnswered,
      totalSimulatedDelayMs: session.totalSimulatedDelayMs,
      sessionJson: JSON.stringify(session),
      updatedAt: Date.now(),
    });
  }

  get(sessionId: string): SurveySession | undefined {
    const row = this.db
      .prepare('SELECT session_json FROM survey_sessions WHERE session_id = ?')
      .get(sessionId) as { session_json?: string } | undefined;
    return row?.session_json ? JSON.parse(row.session_json) as SurveySession : undefined;
  }

  list(limit = 100): StoredSessionSummary[] {
    const rows = this.db.prepare(`
      SELECT session_id AS sessionId, survey_url AS surveyUrl, status,
        started_at AS startedAt, completed_at AS completedAt,
        current_page_index AS currentPageIndex,
        total_questions_answered AS totalQuestionsAnswered,
        total_simulated_delay_ms AS totalSimulatedDelayMs
      FROM survey_sessions
      ORDER BY started_at DESC
      LIMIT ?
    `).all(Math.max(1, Math.min(limit, 500))) as StoredSessionSummary[];
    return rows;
  }

  close(): void {
    this.db.close();
  }
}
