/**
 * GeminiAnswerProvider.ts
 * Section 14 of README specification:
 * AI-powered answer provider using @google/genai.
 * Formats question structure and fields, requests strict JSON mapping to real HTML field names,
 * and seamlessly falls back to TestAnswerProvider if Gemini API quota/rate limits occur.
 */
import { GoogleGenAI } from '@google/genai';
import { IAnswerProvider, AnswerContext } from './AnswerProvider.js';
import { PageModel, PageAnswersModel } from '../questions/QuestionModel.js';
import { TestAnswerProvider } from './TestAnswerProvider.js';

export class GeminiAnswerProvider implements IAnswerProvider {
  private fallbackProvider = new TestAnswerProvider();
  private aiClient: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.aiClient = new GoogleGenAI({ apiKey });
    }
  }

  public async getAnswers(pageModel: PageModel, context: AnswerContext): Promise<PageAnswersModel> {
    if (!this.aiClient) {
      console.log('[GeminiAnswerProvider] No GEMINI_API_KEY detected, using deterministic engine.');
      return this.fallbackProvider.getAnswers(pageModel, context);
    }

    try {
      return await this.callGemini(pageModel, context);
    } catch (err: any) {
      console.warn(`[GeminiAnswerProvider] AI service unavailable or quota reached (${err.message}). Falling back to deterministic engine.`);
      const fallbackAnswers = await this.fallbackProvider.getAnswers(pageModel, context);
      // Annotate reasoning so user sees fallback happened gracefully
      for (const key of Object.keys(fallbackAnswers)) {
        fallbackAnswers[key].reasoning = `[Deterministic Engine] ${fallbackAnswers[key].reasoning}`;
      }
      return fallbackAnswers;
    }
  }

  private async callGemini(pageModel: PageModel, context: AnswerContext): Promise<PageAnswersModel> {
    const questionsToAnswer = pageModel.questions.filter(
      q => !q.isInfoOnly && q.fields.length > 0
    );

    if (questionsToAnswer.length === 0) {
      return {};
    }

    const promptStructure = questionsToAnswer.map(q => ({
      id: q.id,
      text: q.text,
      type: q.type,
      required: q.required,
      instruction: q.instruction || null,
      errorMessage: q.errorMessage || null,
      fields: q.fields.map(f => ({
        name: f.name,
        type: f.type,
        label: f.label,
        options: f.options?.map(o => ({ value: o.value, label: o.text })),
        required: f.required,
        placeholder: f.placeholder,
      })),
    }));

    const systemPrompt = `You are AutoSurvey Intelligence, an advanced automated survey respondent analyzing and executing online surveys.
Respondent Persona: ${context.persona}
${context.customPersonaPrompt ? `Special Persona Guidelines: ${context.customPersonaPrompt}` : ''}

SURVEY QUESTION UNDERSTANDING & ANSWERING REQUIREMENTS:
1. THOROUGHLY READ & UNDERSTAND each question's prompt, description, and instruction (e.g., "Select all that apply", "Choose your top 2", "Rank your satisfaction", "Explain why...").
2. ADHERE TO CONSTRAINTS:
   - If a question is required (required: true), you MUST provide an answer for its fields.
   - For "radio" or single "select" (dropdowns): Choose EXACTLY ONE valid option value from the provided options list that best matches the respondent persona.
   - For "checkbox": Return an array of strings with the selected option values. If instructions specify a number (e.g., "choose at least 2"), satisfy that condition.
   - For "text" or "textarea": Formulate a coherent, articulate, authentic human answer matching the persona (write at least 2-3 detailed sentences for open feedback textareas).
   - For "number" or "rating" or "scale": Provide a sensible number or rating value within the question's bounds.
   - For matrix/grid questions with multiple row fields: Provide an answer for every row field name.
3. PRESERVE EXACT FIELD NAMES: You MUST use the exact "name" string provided in each field. Never invent names.
4. VALIDATION FEEDBACK: If existing validation errors are listed, analyze why the previous answer failed and provide corrective answers that pass validation.
5. REASONING: In the "reasoning" property for each question, explicitly state:
   - What the question was asking and required
   - Why the selected option(s) or response was chosen according to the persona profile.

OUTPUT FORMAT:
Return ONLY valid JSON matching this schema:
{
  "QUESTION_ID": {
    "fields": {
      "EXACT_FIELD_NAME": "VALUE_OR_ARRAY_FOR_CHECKBOXES"
    },
    "reasoning": "Understood requirement: [brief requirement]. Answered: [why this fits the persona]"
  }
}`;

    const userContent = `Here are the questions detected on the current survey page:
${JSON.stringify(promptStructure, null, 2)}

Existing Page Validation Errors (if any):
${JSON.stringify(pageModel.errors)}

Formulate thoughtful, valid responses fulfilling every question requirement in strict JSON format.`;

    let response;
    try {
      response = await this.aiClient!.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userContent}` }] },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
    } catch (e1: any) {
      console.warn('[GeminiAnswerProvider] Primary model gemini-3.1-flash-lite failed, trying gemini-3.8-flash:', e1.message);
      response = await this.aiClient!.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userContent}` }] },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
    }

    let responseText = response.text || '{}';
    // Clean potential markdown wrap
    responseText = responseText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    let parsed: any = {};
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr: any) {
      console.warn('[GeminiAnswerProvider] Failed to parse Gemini response as JSON, falling back:', parseErr.message);
      return this.fallbackProvider.getAnswers(pageModel, context);
    }

    const answers: PageAnswersModel = {};
    for (const q of questionsToAnswer) {
      const qAnswer = parsed[q.id];
      if (qAnswer && qAnswer.fields) {
        answers[q.id] = {
          fields: qAnswer.fields,
          reasoning: qAnswer.reasoning || `Analyzed question requirement "${q.text.slice(0, 40)}..." and formulated response matching ${context.persona} persona.`,
          delayBreakdown: {
            readingMs: 800,
            thinkingMs: 600,
            typingMs: 400,
            totalMs: 1800,
          },
        };
      }
    }

    // Ensure all required fields have answers; if AI omitted any, use fallback for those fields
    for (const q of questionsToAnswer) {
      if (!answers[q.id]) {
        const fb = await this.fallbackProvider.getAnswers({ ...pageModel, questions: [q] }, context);
        if (fb[q.id]) answers[q.id] = fb[q.id];
      }
    }

    return answers;
  }
}
