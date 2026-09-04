import { Router, Request, Response } from 'express';

export const mockSurveysRouter = Router();

// In-memory store for mock survey multi-step sessions
const mockSessions = new Map<string, { currentStep: number; answers: Record<string, any> }>();

interface SurveyDefinition {
  slug: string;
  title: string;
  totalSteps: number;
  renderStep: (step: number, sessionId: string, previousAnswers: Record<string, any>) => string;
}

const SURVEYS: Record<string, SurveyDefinition> = {
  'developer-tools': {
    slug: 'developer-tools',
    title: 'Developer Tools & AI Productivity Survey 2026',
    totalSteps: 3,
    renderStep: (step, sessionId, answers) => {
      if (step === 1) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Developer Tools & AI Productivity Survey - Step 1/3</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #1e293b; max-width: 680px; margin: 40px auto; padding: 24px; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    h1 { font-size: 24px; margin-top: 0; color: #0f172a; }
    .step-badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
    .form-group { margin-bottom: 24px; }
    .question-title { font-weight: 600; font-size: 15px; margin-bottom: 8px; }
    .options-list label { display: block; margin: 6px 0; cursor: pointer; font-size: 14px; }
    .btn { background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 15px; }
    .btn:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="card">
    <span class="step-badge">Step 1 of 3</span>
    <h1>Developer Tools & AI Productivity Survey</h1>
    <p style="color: #64748b; font-size: 14px;">Help us understand how engineers and developers use automation and AI tools in daily workflows.</p>
    <form action="/api/mock-surveys/developer-tools/submit" method="POST">
      <input type="hidden" name="sessionId" value="${sessionId}">
      <input type="hidden" name="step" value="1">
      
      <div class="form-group">
        <div class="question-title">1. What is your primary engineering role? *</div>
        <div class="options-list">
          <label><input type="radio" name="primary_role" value="frontend" required> Frontend / UI Engineer</label>
          <label><input type="radio" name="primary_role" value="fullstack"> Full Stack Developer</label>
          <label><input type="radio" name="primary_role" value="backend"> Backend / Distributed Systems Engineer</label>
          <label><input type="radio" name="primary_role" value="ai_ml"> AI / Machine Learning Specialist</label>
          <label><input type="radio" name="primary_role" value="devops"> DevOps / Cloud Architect</label>
        </div>
      </div>

      <div class="form-group">
        <div class="question-title">2. How frequently do you utilize AI coding assistants in your workflow? *</div>
        <div class="options-list">
          <label><input type="radio" name="ai_usage_frequency" value="daily" required> Daily (Multiple times an hour)</label>
          <label><input type="radio" name="ai_usage_frequency" value="frequently"> Frequently (Several times a day)</label>
          <label><input type="radio" name="ai_usage_frequency" value="occasionally"> Occasionally (A few times a week)</label>
          <label><input type="radio" name="ai_usage_frequency" value="rarely"> Rarely or experimenting</label>
        </div>
      </div>

      <div class="form-group">
        <div class="question-title">3. Which primary programming languages do you actively work with? *</div>
        <div class="options-list">
          <label><input type="checkbox" name="languages" value="typescript"> TypeScript / JavaScript</label>
          <label><input type="checkbox" name="languages" value="python"> Python</label>
          <label><input type="checkbox" name="languages" value="go"> Go</label>
          <label><input type="checkbox" name="languages" value="rust"> Rust</label>
          <label><input type="checkbox" name="languages" value="java_csharp"> Java / C#</label>
        </div>
      </div>

      <button type="submit" class="btn">Next Step &rarr;</button>
    </form>
  </div>
</body>
</html>`;
      }

      if (step === 2) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Developer Tools & AI Productivity Survey - Step 2/3</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #1e293b; max-width: 680px; margin: 40px auto; padding: 24px; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    h1 { font-size: 24px; margin-top: 0; color: #0f172a; }
    .step-badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
    .form-group { margin-bottom: 24px; }
    .question-title { font-weight: 600; font-size: 15px; margin-bottom: 8px; }
    .options-list label { display: block; margin: 6px 0; cursor: pointer; font-size: 14px; }
    .scale-row { display: flex; gap: 16px; margin-top: 8px; }
    .scale-item { display: flex; flex-direction: column; align-items: center; font-size: 13px; }
    .btn { background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 15px; }
    .btn:hover { background: #1d4ed8; }
  </style>
</head>
<body>
  <div class="card">
    <span class="step-badge">Step 2 of 3</span>
    <h1>Developer Tools & AI Productivity Survey</h1>
    <p style="color: #64748b; font-size: 14px;">Evaluations & Efficiency Metrics</p>
    <form action="/api/mock-surveys/developer-tools/submit" method="POST">
      <input type="hidden" name="sessionId" value="${sessionId}">
      <input type="hidden" name="step" value="2">
      
      <div class="form-group">
        <div class="question-title">4. How satisfied are you with code accuracy in modern AI generation? (1 = Very Dissatisfied, 5 = Highly Satisfied) *</div>
        <div class="scale-row">
          <label class="scale-item"><input type="radio" name="accuracy_satisfaction" value="1" required> 1</label>
          <label class="scale-item"><input type="radio" name="accuracy_satisfaction" value="2"> 2</label>
          <label class="scale-item"><input type="radio" name="accuracy_satisfaction" value="3"> 3</label>
          <label class="scale-item"><input type="radio" name="accuracy_satisfaction" value="4"> 4</label>
          <label class="scale-item"><input type="radio" name="accuracy_satisfaction" value="5"> 5</label>
        </div>
      </div>

      <div class="form-group">
        <div class="question-title">5. Estimated productivity gain from development automation: *</div>
        <div class="options-list">
          <label><input type="radio" name="productivity_gain" value="10-25%" required> 10% - 25% faster shipping</label>
          <label><input type="radio" name="productivity_gain" value="25-50%"> 25% - 50% faster shipping</label>
          <label><input type="radio" name="productivity_gain" value="over_50%"> Over 50% accelerated speed</label>
          <label><input type="radio" name="productivity_gain" value="neutral"> Neutral / No significant difference</label>
        </div>
      </div>

      <div class="form-group">
        <div class="question-title">6. What is your preferred primary code editor / environment? *</div>
        <select name="primary_ide" style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px;" required>
          <option value="">-- Please select an option --</option>
          <option value="vscode">VS Code</option>
          <option value="cursor">Cursor AI</option>
          <option value="jetbrains">JetBrains Suite (IntelliJ, WebStorm)</option>
          <option value="neovim">Neovim / Terminal Vim</option>
          <option value="cloud_ide">Cloud / Web IDE (Google AI Studio, Replit, Codespaces)</option>
        </select>
      </div>

      <button type="submit" class="btn">Next Step &rarr;</button>
    </form>
  </div>
</body>
</html>`;
      }

      // Step 3 (Final Step)
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Developer Tools & AI Productivity Survey - Step 3/3</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #1e293b; max-width: 680px; margin: 40px auto; padding: 24px; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    h1 { font-size: 24px; margin-top: 0; color: #0f172a; }
    .step-badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
    .form-group { margin-bottom: 24px; }
    .question-title { font-weight: 600; font-size: 15px; margin-bottom: 8px; }
    textarea, input[type="email"] { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 14px; }
    .btn-submit { background: #16a34a; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 15px; }
    .btn-submit:hover { background: #15803d; }
  </style>
</head>
<body>
  <div class="card">
    <span class="step-badge">Step 3 of 3 (Final Page)</span>
    <h1>Developer Tools & AI Productivity Survey</h1>
    <p style="color: #64748b; font-size: 14px;">Qualitative Feedback & Final Submission</p>
    <form action="/api/mock-surveys/developer-tools/submit" method="POST">
      <input type="hidden" name="sessionId" value="${sessionId}">
      <input type="hidden" name="step" value="3">
      
      <div class="form-group">
        <div class="question-title">7. What is the single biggest bottleneck you encounter when building complex full-stack web applications? *</div>
        <textarea name="biggest_bottleneck" rows="3" placeholder="Describe the pain point..." required></textarea>
      </div>

      <div class="form-group">
        <div class="question-title">8. What future capability would make AI coding assistants significantly more valuable to you? *</div>
        <textarea name="desired_capability" rows="3" placeholder="e.g. better whole-repo architectural reasoning, test generation..." required></textarea>
      </div>

      <div class="form-group">
        <div class="question-title">9. Contact email for optional follow-up research (optional):</div>
        <input type="email" name="contact_email" placeholder="you@example.com">
      </div>

      <button type="submit" class="btn-submit">Submit Survey & Complete</button>
    </form>
  </div>
</body>
</html>`;
    }
  },

  'customer-feedback': {
    slug: 'customer-feedback',
    title: 'Customer Experience & Quality Survey',
    totalSteps: 2,
    renderStep: (step, sessionId, answers) => {
      if (step === 1) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Customer Experience Survey - Step 1/2</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #fafaf9; color: #292524; max-width: 640px; margin: 40px auto; padding: 24px; }
    .card { background: white; border: 1px solid #e7e5e4; border-radius: 12px; padding: 28px; }
    h1 { font-size: 22px; margin-top: 0; color: #1c1917; }
    .form-group { margin-bottom: 20px; }
    .question-title { font-weight: 600; font-size: 15px; margin-bottom: 8px; }
    .options-list label { display: block; margin: 6px 0; cursor: pointer; }
    .btn { background: #0284c7; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div style="color: #0369a1; font-weight: 600; font-size: 13px; margin-bottom: 8px;">Step 1 of 2</div>
    <h1>Customer Experience & Quality Survey</h1>
    <form action="/api/mock-surveys/customer-feedback/submit" method="POST">
      <input type="hidden" name="sessionId" value="${sessionId}">
      <input type="hidden" name="step" value="1">

      <div class="form-group">
        <div class="question-title">1. How did you first discover our product or service? *</div>
        <div class="options-list">
          <label><input type="radio" name="discovery_channel" value="search" required> Online search / Google</label>
          <label><input type="radio" name="discovery_channel" value="social"> Social media or community recommendation</label>
          <label><input type="radio" name="discovery_channel" value="colleague"> Colleague or word of mouth</label>
          <label><input type="radio" name="discovery_channel" value="ad"> Online advertisement</label>
        </div>
      </div>

      <div class="form-group">
        <div class="question-title">2. How would you rate the overall onboarding experience? (1-5) *</div>
        <div style="display: flex; gap: 14px;">
          <label><input type="radio" name="onboarding_rating" value="1" required> 1</label>
          <label><input type="radio" name="onboarding_rating" value="2"> 2</label>
          <label><input type="radio" name="onboarding_rating" value="3"> 3</label>
          <label><input type="radio" name="onboarding_rating" value="4"> 4</label>
          <label><input type="radio" name="onboarding_rating" value="5"> 5</label>
        </div>
      </div>

      <button type="submit" class="btn">Continue to Step 2 &rarr;</button>
    </form>
  </div>
</body>
</html>`;
      }

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Customer Experience Survey - Step 2/2</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #fafaf9; color: #292524; max-width: 640px; margin: 40px auto; padding: 24px; }
    .card { background: white; border: 1px solid #e7e5e4; border-radius: 12px; padding: 28px; }
    h1 { font-size: 22px; margin-top: 0; color: #1c1917; }
    .form-group { margin-bottom: 20px; }
    .question-title { font-weight: 600; font-size: 15px; margin-bottom: 8px; }
    textarea { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; }
    .btn-submit { background: #059669; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div style="color: #0369a1; font-weight: 600; font-size: 13px; margin-bottom: 8px;">Step 2 of 2 (Final)</div>
    <h1>Customer Experience & Quality Survey</h1>
    <form action="/api/mock-surveys/customer-feedback/submit" method="POST">
      <input type="hidden" name="sessionId" value="${sessionId}">
      <input type="hidden" name="step" value="2">

      <div class="form-group">
        <div class="question-title">3. How likely are you to recommend us to a friend or colleague? (0 to 10 NPS) *</div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<label><input type="radio" name="nps_score" value="${n}" required> ${n}</label>`).join(' ')}
        </div>
      </div>

      <div class="form-group">
        <div class="question-title">4. What is one feature or improvement we could implement to make your experience better? *</div>
        <textarea name="improvement_feedback" rows="3" required placeholder="Please share your thoughts..."></textarea>
      </div>

      <button type="submit" class="btn-submit">Submit Survey</button>
    </form>
  </div>
</body>
</html>`;
    }
  },

  'workplace-culture': {
    slug: 'workplace-culture',
    title: 'Workplace Culture & Flexibility Pulse',
    totalSteps: 2,
    renderStep: (step, sessionId, answers) => {
      if (step === 1) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Workplace Culture Pulse - Step 1/2</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #fdf2f8; color: #4a044e; max-width: 640px; margin: 40px auto; padding: 24px; }
    .card { background: white; border: 1px solid #fbcfe8; border-radius: 12px; padding: 28px; }
    h1 { font-size: 22px; margin-top: 0; color: #701a75; }
    .form-group { margin-bottom: 20px; }
    .question-title { font-weight: 600; font-size: 15px; margin-bottom: 8px; color: #4a044e; }
    .options-list label { display: block; margin: 6px 0; cursor: pointer; font-size: 14px; }
    .btn { background: #a21caf; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div style="color: #9d174d; font-weight: 600; font-size: 13px; margin-bottom: 8px;">Step 1 of 2</div>
    <h1>Workplace Culture & Flexibility Pulse</h1>
    <form action="/api/mock-surveys/workplace-culture/submit" method="POST">
      <input type="hidden" name="sessionId" value="${sessionId}">
      <input type="hidden" name="step" value="1">

      <div class="form-group">
        <div class="question-title">1. What is your current work structure? *</div>
        <div class="options-list">
          <label><input type="radio" name="work_structure" value="fully_remote" required> Fully Remote</label>
          <label><input type="radio" name="work_structure" value="hybrid"> Hybrid (1-3 days in office)</label>
          <label><input type="radio" name="work_structure" value="on_site"> On-site / In Office</label>
        </div>
      </div>

      <div class="form-group">
        <div class="question-title">2. Rate your current work-life balance satisfaction (1-5): *</div>
        <div style="display: flex; gap: 14px;">
          <label><input type="radio" name="balance_rating" value="1" required> 1</label>
          <label><input type="radio" name="balance_rating" value="2"> 2</label>
          <label><input type="radio" name="balance_rating" value="3"> 3</label>
          <label><input type="radio" name="balance_rating" value="4"> 4</label>
          <label><input type="radio" name="balance_rating" value="5"> 5</label>
        </div>
      </div>

      <button type="submit" class="btn">Next &rarr;</button>
    </form>
  </div>
</body>
</html>`;
      }

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Workplace Culture Pulse - Step 2/2</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #fdf2f8; color: #4a044e; max-width: 640px; margin: 40px auto; padding: 24px; }
    .card { background: white; border: 1px solid #fbcfe8; border-radius: 12px; padding: 28px; }
    h1 { font-size: 22px; margin-top: 0; color: #701a75; }
    .form-group { margin-bottom: 20px; }
    .question-title { font-weight: 600; font-size: 15px; margin-bottom: 8px; color: #4a044e; }
    textarea { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; }
    .btn-submit { background: #86198f; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <div style="color: #9d174d; font-weight: 600; font-size: 13px; margin-bottom: 8px;">Step 2 of 2 (Final)</div>
    <h1>Workplace Culture & Flexibility Pulse</h1>
    <form action="/api/mock-surveys/workplace-culture/submit" method="POST">
      <input type="hidden" name="sessionId" value="${sessionId}">
      <input type="hidden" name="step" value="2">

      <div class="form-group">
        <div class="question-title">3. Which team collaboration tools are most vital for your focus? *</div>
        <div class="options-list">
          <label><input type="checkbox" name="vital_tools" value="async_docs"> Asynchronous Documentation (Notion/Confluence)</label>
          <label><input type="checkbox" name="vital_tools" value="instant_chat"> Instant Chat (Slack/Discord)</label>
          <label><input type="checkbox" name="vital_tools" value="deep_work_blocks"> Calendar Deep-Work Focus Blocks</label>
          <label><input type="checkbox" name="vital_tools" value="virtual_whiteboard"> Digital Whiteboards</label>
        </div>
      </div>

      <div class="form-group">
        <div class="question-title">4. Any key suggestions for team leadership to foster better engagement? *</div>
        <textarea name="leadership_suggestions" rows="3" required placeholder="Share your suggestions..."></textarea>
      </div>

      <button type="submit" class="btn-submit">Submit Survey</button>
    </form>
  </div>
</body>
</html>`;
    }
  },
  'confirmit-simulation': {
    slug: 'confirmit-simulation',
    title: 'Confirmit Testing & Consumer Flow (Simulation)',
    totalSteps: 4,
    renderStep: (step, sessionId, answers) => {
      if (step === 1) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Confirmit Survey Engine - Testing Features</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; max-width: 680px; margin: 40px auto; padding: 24px; }
    .cf-page { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 28px; }
    .cf-question__text { font-size: 15px; font-weight: 600; margin-bottom: 8px; color: #f8fafc; }
    .cf-question__instruction { font-size: 12px; color: #94a3b8; margin-bottom: 16px; }
    .cf-checkbox-answer { display: block; margin: 8px 0; font-size: 14px; }
    .cf-navigation-next { background: #10b981; color: #022c22; font-weight: bold; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="cf-page">
    <div class="cf-page__survey-name">Confirmit Engine (Testing Mode)</div>
    <form id="page_form" action="/api/mock-surveys/confirmit-simulation/submit" method="POST">
      <input type="hidden" name="sessionId" value="${sessionId}">
      <input type="hidden" name="step" value="1">
      <input type="hidden" name="__sid__" value="token_${sessionId}">
      <input type="hidden" name="__pagemasterid" value="master_101">

      <div class="cf-question cf-question--multi" id="Functionality">
        <div class="cf-question__text">Below is a list of survey features that can be included. (Visible only during testing)</div>
        <div class="cf-question__instruction">/* This question is visible only during testing */</div>
        <label class="cf-checkbox-answer"><input type="checkbox" name="Functionality" value="cookies"> Cookies tracking</label>
        <label class="cf-checkbox-answer"><input type="checkbox" name="Functionality" value="speeder"> Speeder check</label>
        <label class="cf-checkbox-answer"><input type="checkbox" name="Functionality" value="device"> Device detection</label>
      </div>

      <div style="margin-top: 24px;">
        <button type="submit" class="cf-navigation-next">Continue</button>
      </div>
    </form>
  </div>
</body>
</html>`;
      }

      if (step === 2) {
        const hasError = Boolean(answers && answers.hasError);
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Confirmit Survey Engine - Revision Specification</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; max-width: 680px; margin: 40px auto; padding: 24px; }
    .cf-page { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 28px; }
    .cf-question__text { font-size: 15px; font-weight: 600; margin-bottom: 8px; color: #f8fafc; }
    .cf-error-list { background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; font-weight: 600; list-style: none; }
    .cf-radio-answer { display: block; margin: 8px 0; font-size: 14px; }
    .cf-navigation-next { background: #10b981; color: #022c22; font-weight: bold; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="cf-page">
    <div class="cf-page__survey-name">Confirmit Survey Engine</div>
    <form id="page_form" action="/api/mock-surveys/confirmit-simulation/submit" method="POST">
      <input type="hidden" name="sessionId" value="${sessionId}">
      <input type="hidden" name="step" value="2">
      <input type="hidden" name="__sid__" value="token_${sessionId}">
      <input type="hidden" name="__pagemasterid" value="master_102">

      ${hasError ? `
      <ul class="cf-error-list">
        <li>Please select an answer. One or more questions require further input.</li>
      </ul>
      ` : ''}

      <div class="cf-question cf-question--single" id="revision">
        <div class="cf-question__text">revision (HIDDEN IN LIVE)</div>
        <div class="cf-question__instruction">/* HIDDEN IN LIVE - Test Revision Version */</div>
        <label class="cf-radio-answer"><input type="radio" name="revision" value="1"> Revision 1.0 (Standard Build)</label>
        <label class="cf-radio-answer"><input type="radio" name="revision" value="2"> Revision 2.0 (Enhanced Verification)</label>
        <label class="cf-radio-answer"><input type="radio" name="revision" value="3"> Revision 3.0 (Production Release Candidate)</label>
      </div>

      <div style="margin-top: 24px;">
        <button type="submit" class="cf-navigation-next">Continue</button>
      </div>
    </form>
  </div>
</body>
</html>`;
      }

      if (step === 3) {
        // Step 3: PURE INFORMATIONAL SCREEN (No questions, only info and Continue button)
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Confirmit Survey Engine - Welcome & Information</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; max-width: 680px; margin: 40px auto; padding: 24px; }
    .cf-page { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 28px; }
    .cf-page__title { font-size: 20px; font-weight: bold; margin-bottom: 12px; color: #34d399; }
    .cf-question--info { font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; }
    .cf-navigation-next { background: #10b981; color: #022c22; font-weight: bold; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="cf-page">
    <div class="cf-page__survey-name">Confirmit Survey Engine</div>
    <form id="page_form" action="/api/mock-surveys/confirmit-simulation/submit" method="POST">
      <input type="hidden" name="sessionId" value="${sessionId}">
      <input type="hidden" name="step" value="3">
      <input type="hidden" name="__sid__" value="token_${sessionId}">
      <input type="hidden" name="__pagemasterid" value="master_103">

      <div class="cf-question cf-question--info" id="Info_Start">
        <h2 class="cf-page__title">Thank you for agreeing to participate in this study.</h2>
        <p>This survey examines digital tool adoption, automation preferences, and workflow satisfaction. All information collected is confidential and will only be evaluated in aggregate.</p>
        <p>This session will take approximately 2-3 minutes of focused attention. Please click <strong>Continue</strong> below to proceed to the questions.</p>
      </div>

      <div style="margin-top: 24px;">
        <button type="submit" class="cf-navigation-next">Continue</button>
      </div>
    </form>
  </div>
</body>
</html>`;
      }

      // Step 4: Actual questions
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Confirmit Survey Engine - Location & Experience</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; max-width: 680px; margin: 40px auto; padding: 24px; }
    .cf-page { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 28px; }
    .cf-question__text { font-size: 15px; font-weight: 600; margin-bottom: 8px; color: #f8fafc; }
    .cf-radio-answer { display: block; margin: 8px 0; font-size: 14px; }
    .cf-navigation-next { background: #10b981; color: #022c22; font-weight: bold; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="cf-page">
    <div class="cf-page__survey-name">Confirmit Survey Engine</div>
    <form id="page_form" action="/api/mock-surveys/confirmit-simulation/submit" method="POST">
      <input type="hidden" name="sessionId" value="${sessionId}">
      <input type="hidden" name="step" value="4">
      <input type="hidden" name="__sid__" value="token_${sessionId}">
      <input type="hidden" name="__pagemasterid" value="master_104">

      <div class="cf-question cf-question--single" id="S1">
        <div class="cf-question__text">1. Please select the primary region or state you currently reside in: *</div>
        <label class="cf-radio-answer"><input type="radio" name="S1" value="California" required> California</label>
        <label class="cf-radio-answer"><input type="radio" name="S1" value="New York"> New York</label>
        <label class="cf-radio-answer"><input type="radio" name="S1" value="Texas"> Texas</label>
        <label class="cf-radio-answer"><input type="radio" name="S1" value="Washington"> Washington</label>
        <label class="cf-radio-answer"><input type="radio" name="S1" value="Other"> Other Region</label>
      </div>

      <div class="cf-question cf-question--single" id="S2" style="margin-top: 20px;">
        <div class="cf-question__text">2. How would you rate your overall satisfaction with modern digital workflow tools? *</div>
        <label class="cf-radio-answer"><input type="radio" name="S2" value="5" required> 5 - Extremely Satisfied</label>
        <label class="cf-radio-answer"><input type="radio" name="S2" value="4"> 4 - Satisfied</label>
        <label class="cf-radio-answer"><input type="radio" name="S2" value="3"> 3 - Neutral</label>
        <label class="cf-radio-answer"><input type="radio" name="S2" value="2"> 2 - Dissatisfied</label>
      </div>

      <div style="margin-top: 24px;">
        <button type="submit" class="cf-navigation-next">Submit Survey</button>
      </div>
    </form>
  </div>
</body>
</html>`;
    }
  },
  'partner-redirect': {
    slug: 'partner-redirect',
    title: 'Healthcare Digital Telehealth Survey',
    totalSteps: 2,
    renderStep: (step, sessionId) => {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Healthcare Digital Telehealth Survey - Step 1/2</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f0fdfa; color: #134e4a; max-width: 680px; margin: 40px auto; padding: 24px; }
    .card { background: white; border: 1px solid #99f6e4; border-radius: 12px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    h1 { font-size: 22px; margin-top: 0; color: #115e59; }
    .step-badge { display: inline-block; background: #ccfbf1; color: #0f766e; padding: 4px 10px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
    .form-group { margin-bottom: 24px; }
    .question-title { font-weight: 600; font-size: 15px; margin-bottom: 8px; color: #134e4a; }
    .options-list label { display: block; margin: 6px 0; cursor: pointer; font-size: 14px; }
    .btn { background: #0d9488; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 15px; }
    .btn:hover { background: #0f766e; }
  </style>
</head>
<body>
  <div class="card">
    <span class="step-badge">Step 1 of 2</span>
    <h1>Healthcare Digital Telehealth Survey</h1>
    <p style="color: #64748b; font-size: 14px;">Evaluating telemedicine and electronic healthcare platforms (will redirect on submit to partner evaluation).</p>
    <form action="/api/mock-surveys/partner-redirect/submit" method="POST">
      <input type="hidden" name="sessionId" value="${sessionId}">
      <input type="hidden" name="step" value="1">
      
      <div class="form-group">
        <div class="question-title">1. What is your primary clinical or healthcare role? *</div>
        <div class="options-list">
          <label><input type="radio" name="health_role" value="physician" required> Attending Physician / Clinician</label>
          <label><input type="radio" name="health_role" value="informatics"> Clinical Informatics Specialist</label>
          <label><input type="radio" name="health_role" value="admin"> Healthcare Administrator</label>
          <label><input type="radio" name="health_role" value="researcher"> Medical Research Investigator</label>
        </div>
      </div>

      <div class="form-group">
        <div class="question-title">2. How often do you utilize remote telehealth technologies? *</div>
        <div class="options-list">
          <label><input type="radio" name="telehealth_freq" value="daily" required> Daily clinical consultations</label>
          <label><input type="radio" name="telehealth_freq" value="weekly"> 2-3 times per week</label>
          <label><input type="radio" name="telehealth_freq" value="monthly"> Occasionally / Monthly</label>
          <label><input type="radio" name="telehealth_freq" value="rarely"> Rarely or Never</label>
        </div>
      </div>

      <button type="submit" class="btn">Submit & Continue &rarr;</button>
    </form>
  </div>
</body>
</html>`;
    }
  }
};

// GET /api/mock-surveys/:slug - Renders current step of survey
mockSurveysRouter.get('/:slug', (req: Request, res: Response) => {
  const { slug } = req.params;
  const survey = SURVEYS[slug];
  if (!survey) {
    res.status(404).send('Survey not found');
    return;
  }

  const sessionId = (req.query.sessionId as string) || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  let session = mockSessions.get(sessionId);
  if (!session) {
    session = { currentStep: 1, answers: {} };
    mockSessions.set(sessionId, session);
  }

  const html = survey.renderStep(session.currentStep, sessionId, session.answers);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// POST /api/mock-surveys/:slug/submit - Receives step answers and auto-advances
mockSurveysRouter.post('/:slug/submit', (req: Request, res: Response) => {
  const { slug } = req.params;
  const survey = SURVEYS[slug];
  if (!survey) {
    res.status(404).send('Survey not found');
    return;
  }

  const body = req.body || {};
  const sessionId = body.sessionId || `sess_${Date.now()}`;
  const submittedStep = parseInt(body.step || '1', 10);

  let session = mockSessions.get(sessionId);
  if (!session) {
    session = { currentStep: submittedStep, answers: {} };
    mockSessions.set(sessionId, session);
  }

  // For confirmit-simulation, step 2 requires revision. If submitted empty, simulate validation error!
  if (slug === 'confirmit-simulation' && submittedStep === 2 && !body.revision) {
    const errorHtml = survey.renderStep(2, sessionId, { ...session.answers, hasError: true });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(errorHtml);
    return;
  }

  // If slug is partner-redirect, simulate partner redirect to customer-feedback survey
  if (slug === 'partner-redirect') {
    res.redirect(302, '/api/mock-surveys/customer-feedback');
    return;
  }

  // Record answers
  session.answers = { ...session.answers, ...body };

  // Check if final step reached
  if (submittedStep >= survey.totalSteps) {
    // Return final completion page!
    const completionHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Survey Completed</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f0fdf4; color: #14532d; max-width: 640px; margin: 60px auto; padding: 24px; text-align: center; }
    .card { background: white; border: 1px solid #bbf7d0; border-radius: 16px; padding: 40px 32px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
    .check-icon { width: 56px; height: 56px; background: #22c55e; color: white; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 20px; }
    h1 { font-size: 26px; color: #15803d; margin: 0 0 12px; }
    p { font-size: 16px; color: #4b5563; line-height: 1.6; margin: 0 0 24px; }
    .receipt { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 13px; text-align: left; color: #334155; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check-icon">&#10003;</div>
    <h1 id="completion-message">Your response has been recorded</h1>
    <p>Thank you for completing this survey! Your human-simulated responses have been successfully submitted and verified across all ${survey.totalSteps} steps.</p>
    <div class="receipt">
      <div><strong>Status:</strong> COMPLETED</div>
      <div><strong>Survey:</strong> ${survey.title}</div>
      <div><strong>Session ID:</strong> ${sessionId}</div>
      <div><strong>Total Pages Submitted:</strong> ${survey.totalSteps}</div>
      <div><strong>Timestamp:</strong> ${new Date().toISOString()}</div>
    </div>
  </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(completionHtml);
    return;
  }

  // Advance to next step
  session.currentStep = submittedStep + 1;
  const nextHtml = survey.renderStep(session.currentStep, sessionId, session.answers);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(nextHtml);
});
