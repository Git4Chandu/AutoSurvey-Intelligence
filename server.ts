import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { mockSurveysRouter } from './server/mockSurveys.js';
import { surveyEngine } from './server/engine/SurveyEngine.js';
import { PageParser } from './server/engine/parser/PageParser.js';
import { SimulationConfig } from './src/types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Mock survey routes
  app.use('/api/mock-surveys', mockSurveysRouter);

  // Parse a survey URL without running (preview mode)
  app.post('/api/survey/parse', async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
      }

      let targetUrl = url.trim();
      if (targetUrl.startsWith('/')) {
        const protocol = req.protocol;
        const host = req.get('host') || 'localhost:3000';
        targetUrl = `${protocol}://${host}${targetUrl}`;
      }

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      const html = await response.text();
      const pageModel = PageParser.parse(html, response.url || targetUrl);
      res.json({
        page: {
          pageIndex: 1,
          totalEstimatedPages: 1,
          title: pageModel.title,
          description: pageModel.description,
          questions: pageModel.questions.map(q => ({
            id: q.id,
            title: q.text,
            description: q.instruction,
            type: q.fields[0]?.type === 'select' ? 'select' : q.fields[0]?.type === 'checkbox' ? 'checkbox' : 'radio',
            options: q.fields.flatMap(f => f.options || []).map((o, i) => ({
              id: `${q.id}_opt_${i}`,
              label: o.text,
              value: o.value,
            })),
            fields: q.fields.map(f => ({
              name: f.name,
              type: f.type,
              required: f.required,
              options: f.options?.map((o, i) => ({
                id: `${f.name}_opt_${i}`,
                label: o.text,
                value: o.value,
              })),
              defaultValue: f.defaultValue,
              placeholder: f.placeholder,
            })),
            required: q.required,
            isHiddenForLive: q.isHiddenForLive,
            isInfoOnly: q.isInfoOnly,
            errorMessage: q.errorMessage,
          })),
          actionUrl: pageModel.form.action,
          formMethod: pageModel.form.method,
          hiddenFields: pageModel.hiddenFields,
          submitButtonLabel: pageModel.submitButtonLabel,
          isFinalPage: pageModel.completed,
          isInfoOnlyPage: pageModel.isInfoOnly,
          isHiddenPage: pageModel.isHiddenPage,
          hasValidationErrors: pageModel.errors.length > 0,
          validationErrors: pageModel.errors,
        },
        isCompleted: pageModel.completed,
        completionMessage: pageModel.completionMessage,
      });
    } catch (err: any) {
      console.error('Parse error:', err);
      res.status(500).json({ error: err.message || 'Failed to parse survey URL' });
    }
  });

  // Start automated survey answering session
  app.post('/api/survey/start', async (req, res) => {
    try {
      const { url, config } = req.body;
      if (!url) {
        res.status(400).json({ error: 'Survey URL is required' });
        return;
      }

      const protocol = req.protocol;
      const host = req.get('host') || 'localhost:3000';
      const baseHost = `${protocol}://${host}`;

      const session = await surveyEngine.startSession(url, config as SimulationConfig, baseHost);
      res.json({ sessionId: session.sessionId, session });
    } catch (err: any) {
      console.error('Start survey error:', err);
      res.status(500).json({ error: err.message || 'Failed to start survey run' });
    }
  });

  // Get session status (polling)
  app.get('/api/survey/status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = surveyEngine.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  });

  // Real-time Server-Sent Events (SSE) stream for live updates
  app.get('/api/survey/stream/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = surveyEngine.getSession(sessionId);

    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send initial snapshot
    res.write(`data: ${JSON.stringify(session)}\n\n`);

    const unsubscribe = surveyEngine.subscribe(sessionId, updatedSession => {
      res.write(`data: ${JSON.stringify(updatedSession)}\n\n`);
      if (updatedSession.status === 'completed' || updatedSession.status === 'error') {
        // give brief delay then finish stream
        setTimeout(() => {
          try {
            res.end();
          } catch {}
        }, 1000);
      }
    });

    req.on('close', () => {
      unsubscribe();
    });
  });

  // Pause session
  app.post('/api/survey/pause/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    surveyEngine.pauseSession(sessionId);
    res.json({ ok: true });
  });

  // Resume session
  app.post('/api/survey/resume/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    surveyEngine.resumeSession(sessionId);
    res.json({ ok: true });
  });

  // Stop session
  app.post('/api/survey/stop/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    surveyEngine.stopSession(sessionId);
    res.json({ ok: true });
  });

  // Get live augmented HTML screen of current answering page
  app.get('/api/survey/screen/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const pageIndexStr = req.query.page as string | undefined;
    const pageIndex = pageIndexStr ? parseInt(pageIndexStr, 10) : undefined;
    const html = surveyEngine.getScreenHtml(sessionId, pageIndex);

    if (!html) {
      res.status(404).send('<!DOCTYPE html><html><body style="font-family:sans-serif;padding:30px;background:#030712;color:#94a3b8;"><h2>Screen Not Found</h2><p>Session not found or screen data unavailable.</p></body></html>');
      return;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  });

  // Get archived survey last-page screen snapshot
  app.get('/api/survey/archive-screen/:sessionId/:archiveId', (req, res) => {
    const { sessionId, archiveId } = req.params;
    const html = surveyEngine.getArchiveScreenHtml(sessionId, archiveId);

    if (!html) {
      res.status(404).send('<!DOCTYPE html><html><body style="font-family:sans-serif;padding:30px;background:#030712;color:#94a3b8;"><h2>Archive Screen Not Found</h2><p>Archived screen not found.</p></body></html>');
      return;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  });

  // Vite middleware or static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AutoSurvey Intelligence server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
