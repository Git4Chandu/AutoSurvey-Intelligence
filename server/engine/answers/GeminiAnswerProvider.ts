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
import { isSelectPlaceholder } from '../parser/OptionParser.js';

export class GeminiAnswerProvider implements IAnswerProvider {
  private static runtimeApiKey: string | undefined;
  private fallbackProvider = new TestAnswerProvider();
  private aiClient: GoogleGenAI | null = null;
  private readonly requireAi: boolean;

  public static configureApiKey(apiKey: string | undefined): void {
    GeminiAnswerProvider.runtimeApiKey = apiKey?.trim() || undefined;
  }

  public static hasConfiguredApiKey(): boolean {
    return Boolean(GeminiAnswerProvider.runtimeApiKey || process.env.GEMINI_API_KEY);
  }

  constructor(requireAi = false) {
    this.requireAi = requireAi;
    const apiKey = GeminiAnswerProvider.runtimeApiKey || process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.aiClient = new GoogleGenAI({ apiKey });
    }
  }

  public async getAnswers(pageModel: PageModel, context: AnswerContext): Promise<PageAnswersModel> {
    if (!this.aiClient) {
      if (this.requireAi) {
        throw new Error('AI mode is selected, but Gemini is not connected. Add a Gemini API key in Heuristic Parameters.');
      }
      console.warn('[GeminiAnswerProvider] No Gemini API key detected; using deterministic fallback for this page.');
      const fallbackAnswers = await this.fallbackProvider.getAnswers(pageModel, context);
      for (const key of Object.keys(fallbackAnswers)) {
        fallbackAnswers[key].reasoning = `[Deterministic fallback: Gemini is not connected] ${fallbackAnswers[key].reasoning}`;
      }
      return fallbackAnswers;
    }

    try {
      return await this.callGemini(pageModel, context);
    } catch (err: any) {
      if (this.requireAi) {
        throw new Error(`Gemini could not review page ${context.pageIndex}: ${err?.message || 'unknown AI error'}`);
      }
      console.warn(`[GeminiAnswerProvider] AI review failed for page ${context.pageIndex} (${err.message}). Falling back to deterministic engine.`);
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
      fields: q.fields.map(f => {
        const cleanOptions = f.options?.filter(o => !isSelectPlaceholder(o));
        const effectiveOptions = cleanOptions && cleanOptions.length > 0 ? cleanOptions : f.options;
        return {
          name: f.name,
          type: f.type,
          label: f.label,
          options: effectiveOptions?.map(o => ({ value: o.value, label: o.text || o.value })),
          required: f.required,
          placeholder: f.placeholder,
        };
      }),
    }));

    const systemPrompt = `You are AutoSurvey Intelligence, an AI decision module for authorized survey fixtures and test environments.
Respondent Persona: ${context.persona}
${context.customPersonaPrompt ? `Special Persona Guidelines: ${context.customPersonaPrompt}` : ''}
${context.surveyReferenceText ? `AUTHORITATIVE TEST CONTEXT (use this before making each answer):
${context.surveyReferenceText.slice(0, 12000)}` : 'AUTHORITATIVE TEST CONTEXT: none supplied.'}
Run variation seed: ${context.runSeed || 'default'}

DECISION ORDER:
1. Use the authoritative test context and persona facts.
2. Apply the current question text, question instruction, field type, and available option labels.
3. Return the exact HTML option value for the chosen label; never substitute the first option or a numeric-looking value without matching its label.
4. Keep the decision truthful to the supplied test persona. Do not fabricate eligibility or bypass a live third-party screener.

SURVEY QUESTION UNDERSTANDING & ANSWERING REQUIREMENTS:
1. THOROUGHLY READ & UNDERSTAND each question's prompt, description, and instruction (e.g., "Select all that apply", "Choose your top 2", "Rank your satisfaction", "Explain why...").
2. ADHERE TO CONSTRAINTS:
   - If a question is required (required: true) or a dropdown/radio choice, you MUST provide an answer for its fields.
   - For "radio" or single "select" (dropdowns): Choose EXACTLY ONE valid option value from the provided options list that best matches the respondent persona. Never choose placeholder values (like "", "-1", or "Select...").
   - For "checkbox": Return an array of strings with the selected option values. If instructions specify a number (e.g., "choose at least 2"), satisfy that condition.
   - For "text" or "textarea": Formulate a coherent, articulate, authentic human answer matching the persona (write at least 2-3 detailed sentences for open feedback textareas).
   - For "number" or "rating" or "scale": Provide a sensible number or rating value within the question's bounds.
   - For matrix/grid questions with multiple row fields: Provide an answer for every row field name.
3. PRESERVE EXACT FIELD NAMES: You MUST use the exact "name" string provided in each field. Never invent names.
4. VALIDATION FEEDBACK: If existing validation errors are listed, analyze why the previous answer failed and provide corrective answers that pass validation.
5. REASONING: In the "reasoning" property for each question, explicitly state:
   - What the question was asking and required
   - Why the selected option(s) or response was chosen according to the persona profile.
6. Use the authoritative test context and respondent persona as decision context. If an eligibility question cannot be truthfully answered from the available context, stop with an explicit limitation rather than inventing a qualifying answer.
7. Avoid blindly repeating a prior selection: when several options are valid, use the run seed and question wording to make a varied but coherent choice. Never sacrifice consistency with explicit instructions or persona.

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
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userContent}` }] },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });
    } catch (e1: any) {
      console.warn('[GeminiAnswerProvider] Primary model gemini-2.5-flash failed, trying gemini-2.0-flash:', e1.message);
      response = await this.aiClient!.models.generateContent({
        model: 'gemini-2.0-flash',
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
      const fallbackAnswers = await this.fallbackProvider.getAnswers(pageModel, context);
      for (const key of Object.keys(fallbackAnswers)) {
        fallbackAnswers[key].reasoning = `[Deterministic fallback after Gemini response parsing failure] ${fallbackAnswers[key].reasoning}`;
      }
      return fallbackAnswers;
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
        if (fb[q.id]) {
          fb[q.id].reasoning = `[Deterministic fallback: Gemini omitted this question] ${fb[q.id].reasoning}`;
          answers[q.id] = fb[q.id];
        }
      }
    }

    return answers;
  }
}
