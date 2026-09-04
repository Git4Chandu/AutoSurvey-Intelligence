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
      fields: q.fields.map(f => ({
        name: f.name,
        type: f.type,
        label: f.label,
        options: f.options?.map(o => ({ value: o.value, label: o.text })),
        required: f.required,
      })),
    }));

    const systemPrompt = `You are an automated survey testing respondent executing survey quality assurance.
Respondent Persona: ${context.persona}
${context.customPersonaPrompt ? `Persona Instructions: ${context.customPersonaPrompt}` : ''}

CRITICAL RULES:
1. You MUST answer every question by providing values for its EXACT field names.
2. DO NOT invent or fabricate field names. Only use the "name" provided in each field.
3. For "select" (dropdowns) or "radio", the value MUST be one of the option values provided.
4. For multiple dropdowns, provide an answer for each select field.
5. For checkboxes, return an array of selected option values.
6. Return ONLY valid JSON matching this schema:
{
  "QUESTION_ID": {
    "fields": {
      "FIELD_NAME": "OPTION_VALUE_OR_TEXT"
    },
    "reasoning": "Short explanation of why this answer fits the persona"
  }
}`;

    const userContent = `Here are the questions on the survey page:
${JSON.stringify(promptStructure, null, 2)}

Existing Page Validation Errors (if any):
${JSON.stringify(pageModel.errors)}

Provide answers in strict JSON format.`;

    const response = await this.aiClient!.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userContent}` }] },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const responseText = response.text || '';
    const parsed = JSON.parse(responseText);

    const answers: PageAnswersModel = {};
    for (const q of questionsToAnswer) {
      const qAnswer = parsed[q.id];
      if (qAnswer && qAnswer.fields) {
        answers[q.id] = {
          fields: qAnswer.fields,
          reasoning: qAnswer.reasoning || 'Answered via AI survey respondent simulation.',
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
