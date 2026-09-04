import { GoogleGenAI } from "@google/genai";
import { SurveyQuestion, QuestionAnswer, SimulationConfig, PersonaType } from "../src/types.js";

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const PERSONA_DESCRIPTIONS: Record<PersonaType, string> = {
  tech_pro: "Experienced software engineer and technology professional in their early 30s. Highly tech-savvy, values high performance, clean UI, privacy, developer tooling, and modern automated workflows.",
  general_consumer: "Average everyday digital consumer in their late 20s. Looks for reliability, good customer service, ease of use, fair pricing, and clear communication.",
  enthusiastic_user: "Engaged early-adopter who is positive, excited about new technological features, gives constructive feedback, and appreciates seamless digital experiences.",
  thoughtful_evaluator: "Analytical, methodical respondent who weighs pros and cons carefully, provides balanced ratings (rarely all 5/5 or all 1/1), and writes detailed actionable observations.",
  student_researcher: "College graduate student on a budget, values free tiers, collaborative features, educational discounts, and mobile accessibility.",
  custom: "Custom human respondent profile defined by user."
};

interface AnswerResult {
  questionId: string;
  selectedValues: string[];
  textResponse?: string;
  reasoning: string;
}

export async function generateIntelligentAnswers(
  surveyTitle: string,
  pageDescription: string,
  questions: SurveyQuestion[],
  config: SimulationConfig,
  previousAnswersHistory: QuestionAnswer[],
  validationErrors?: string[]
): Promise<AnswerResult[]> {
  const personaDetail = config.persona === 'custom' && config.customPersonaPrompt
    ? config.customPersonaPrompt
    : PERSONA_DESCRIPTIONS[config.persona] || PERSONA_DESCRIPTIONS.tech_pro;

  const previousContext = previousAnswersHistory.map(a => 
    `- Question: "${a.questionTitle}" -> Answer: ${a.textResponse || a.selectedValues.join(', ')}`
  ).join('\n');

  const errorDirective = validationErrors && validationErrors.length > 0
    ? `\nCRITICAL ATTENTION - VALIDATION ERROR PREVIOUSLY RAISED ON THIS PAGE:
The survey returned the following error message(s):
${validationErrors.map(e => `  * ${e}`).join('\n')}
You MUST provide or select a valid, acceptable answer that resolves this error and allows advancing to the next page.\n`
    : '';

  const prompt = `You are simulating a realistic, human survey respondent answering an online survey.
You must exhibit true human intelligence, consistency, and contextual nuance.

RESPONDENT PERSONA:
${personaDetail}

SURVEY TITLE: "${surveyTitle || 'Online Survey'}"
PAGE CONTEXT: "${pageDescription || 'Survey questions page'}"
${errorDirective}
PREVIOUS QUESTIONS ANSWERED IN THIS SURVEY (Stay consistent with these):
${previousContext || 'None (First page)'}

CURRENT QUESTIONS TO ANSWER:
${JSON.stringify(questions, null, 2)}

INSTRUCTIONS:
1. For each question in the list, determine the most genuine, natural human response appropriate for the assigned persona.
2. If this is a testing question or hidden question that raised a validation error (e.g. "Please select an answer"), select the most appropriate or default valid option to satisfy validation and proceed.
3. Maintain strict internal consistency with earlier answers (e.g., if you said you use Mac in question 1, do not claim Windows-only later).
4. For single-choice / radio / select: Select exactly ONE valid option value from the question's provided options list.
5. For multiple-choice / checkbox: Select 1 to 3 realistic valid option values from the question's options list.
6. For scale / rating: Provide a realistic numeric rating within the specified scale (e.g. 1 to 5, or 1 to 10).
7. For open-ended text / textarea: Write a natural, human-written response (1-3 sentences) in the persona's authentic voice, without sounding like a robotic template.
8. Provide a short 1-sentence "reasoning" explaining why a human with this persona chose this answer.

Return ONLY a valid JSON array of objects conforming to this schema:
[
  {
    "questionId": "string matching the question id",
    "selectedValues": ["value1"], // array of chosen option values or scale number as string
    "textResponse": "optional text response for text/textarea inputs",
    "reasoning": "brief explanation of why this human answer was picked"
  }
]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const rawText = response.text?.trim() || "";
    const parsed = JSON.parse(rawText) as AnswerResult[];

    // Ensure all questions have an answer
    return questions.map(q => {
      const match = parsed.find(p => p.questionId === q.id);
      if (match) return match;
      return generateFallbackAnswer(q, config.persona);
    });
  } catch (error) {
    console.warn("Gemini API call encountered an error or key issue, using heuristic human simulation fallback:", error);
    return questions.map(q => generateFallbackAnswer(q, config.persona));
  }
}

function generateFallbackAnswer(question: SurveyQuestion, persona: PersonaType): AnswerResult {
  const options = question.options || [];

  if (question.type === 'radio' || question.type === 'select') {
    // Pick an option realistically (often middle or positive for tech/consumer)
    const index = Math.min(Math.floor(options.length * 0.6), Math.max(0, options.length - 1));
    const chosen = options[index] || { value: 'option_1', label: 'Selected Option' };
    return {
      questionId: question.id,
      selectedValues: [chosen.value],
      textResponse: chosen.label,
      reasoning: `Selected '${chosen.label}' as the most fitting response for the ${persona} profile.`
    };
  }

  if (question.type === 'checkbox') {
    const chosen = options.slice(0, Math.min(2, options.length));
    return {
      questionId: question.id,
      selectedValues: chosen.map(o => o.value),
      textResponse: chosen.map(o => o.label).join(', '),
      reasoning: `Selected key relevant items based on everyday usage habits.`
    };
  }

  if (question.type === 'scale' || question.type === 'rating') {
    const min = question.scaleMin || 1;
    const max = question.scaleMax || 5;
    // Human tendency: 4 out of 5 or 8 out of 10
    const val = Math.round(min + (max - min) * 0.75);
    return {
      questionId: question.id,
      selectedValues: [String(val)],
      textResponse: String(val),
      reasoning: `Rated ${val}/${max} reflecting solid overall satisfaction with slight room for improvement.`
    };
  }

  if (question.type === 'email') {
    return {
      questionId: question.id,
      selectedValues: ['user.survey.response@example.com'],
      textResponse: 'user.survey.response@example.com',
      reasoning: `Provided a standard professional email address.`
    };
  }

  if (question.type === 'number') {
    return {
      questionId: question.id,
      selectedValues: ['3'],
      textResponse: '3',
      reasoning: `Provided a typical estimate value.`
    };
  }

  // Text or Textarea
  const sampleResponses: Record<string, string> = {
    tech_pro: "The performance and ease of integration are impressive. Would appreciate deeper documentation on custom webhooks and API throttling.",
    general_consumer: "The overall experience was straightforward and fast. Clear navigation made it easy to find what I needed.",
    enthusiastic_user: "Really love the modern design and responsive UI! Keep adding more smart automation features.",
    thoughtful_evaluator: "Good core functionality with dependable execution. Minor suggestions would be better keyboard shortcuts and quicker page transitions.",
    student_researcher: "Very accessible tool with intuitive layout. Perfect for project collaboration and daily task tracking.",
    custom: "Thoughtful feedback provided based on current requirements and everyday workflow."
  };

  const text = sampleResponses[persona] || "Overall a very positive and functional experience with intuitive layout.";
  return {
    questionId: question.id,
    selectedValues: [text],
    textResponse: text,
    reasoning: `Formulated a balanced, constructive open-ended perspective matching the persona.`
  };
}
