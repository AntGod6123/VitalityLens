/**
 * AI service — multi-provider gateway with structured skill outputs.
 *
 * Supported providers:
 *   - 'claude'  → Anthropic Claude API (@anthropic-ai/sdk)
 *   - 'openai'  → OpenAI API (openai SDK)
 *
 * Every skill returns AISkillResponse<T> with a typed data payload,
 * so the UI always gets the same shape regardless of provider.
 */

import {
  AIProvider,
  AISkillName,
  AISkillResponse,
  DocumentAnalysisOutput,
  InjuryFilterOutput,
  QoLRecommendationsOutput,
  EnergyCoachingOutput,
  MuscleGroup,
} from '../types';

// ─── Provider config ──────────────────────────────────────────────────────────

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  /** claude: model id; openai: model id */
  model?: string;
}

const DEFAULT_MODELS: Record<AIProvider, string> = {
  claude: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  none: '',
};

// ─── Low-level send ───────────────────────────────────────────────────────────

async function sendPrompt(config: AIConfig, systemPrompt: string, userPrompt: string): Promise<string> {
  if (config.provider === 'none') throw new Error('No AI provider configured.');

  const model = config.model ?? DEFAULT_MODELS[config.provider];

  if (config.provider === 'claude') {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic.default({ apiKey: config.apiKey });
    const message = await client.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    return (message.content[0] as any).text as string;
  }

  if (config.provider === 'openai') {
    const OpenAI = require('openai');
    const client = new OpenAI.default({ apiKey: config.apiKey });
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1024,
    });
    return response.choices[0].message.content ?? '';
  }

  throw new Error(`Unknown provider: ${config.provider}`);
}

function parseJSON<T>(text: string): T {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/) ?? text.match(/(\{[\s\S]*\})/);
  const jsonStr = match ? match[1] : text;
  return JSON.parse(jsonStr);
}

function wrap<T>(
  provider: AIProvider,
  skill: AISkillName,
  data: T,
  rawText?: string,
): AISkillResponse<T> {
  return { success: true, provider, skill, data, rawText };
}

function wrapError<T>(provider: AIProvider, skill: AISkillName, error: unknown): AISkillResponse<T> {
  return {
    success: false,
    provider,
    skill,
    data: null as unknown as T,
    error: error instanceof Error ? error.message : String(error),
  };
}

// ─── Skill: Document Analysis ─────────────────────────────────────────────────

const DOCUMENT_ANALYSIS_SYSTEM = `
You are a medical document analyst assistant for a fitness app.
Your job: analyse uploaded medical documents and extract information relevant to exercise safety.
Always respond with valid JSON matching this schema exactly:
{
  "summary": "plain-language summary in 2-3 sentences",
  "conditions": ["list of identified medical conditions or diagnoses"],
  "workoutRestrictions": ["list of specific exercise restrictions or contraindications"],
  "restrictedMuscleGroups": ["list from: chest, back, shoulders, biceps, triceps, forearms, core, glutes, quads, hamstrings, calves, traps, lats"],
  "recommendations": ["list of quality-of-life and training recommendations"],
  "urgencyLevel": "none | monitor | consult_doctor"
}
Wrap your JSON in \`\`\`json ... \`\`\`.
`.trim();

export async function analyseDocument(
  config: AIConfig,
  documentText: string,
): Promise<AISkillResponse<DocumentAnalysisOutput>> {
  try {
    const raw = await sendPrompt(
      config,
      DOCUMENT_ANALYSIS_SYSTEM,
      `Analyse this medical document:\n\n${documentText}`,
    );
    const data = parseJSON<DocumentAnalysisOutput>(raw);
    return wrap(config.provider, 'document_analysis', data, raw);
  } catch (e) {
    return wrapError(config.provider, 'document_analysis', e);
  }
}

// ─── Skill: Injury Filter ─────────────────────────────────────────────────────

const INJURY_FILTER_SYSTEM = `
You are an exercise safety assistant. Given a list of active injuries and a list of exercises,
determine which exercises are safe, which are restricted, and suggest modifications where possible.
Respond with valid JSON:
{
  "safeExerciseIds": ["exercise ids that are safe"],
  "restrictedExerciseIds": ["exercise ids that must be avoided"],
  "modifiedExercises": [{"exerciseId": "id", "modification": "how to modify safely"}],
  "reasoning": "brief explanation of your decisions"
}
Wrap in \`\`\`json ... \`\`\`.
`.trim();

export async function filterInjuredExercises(
  config: AIConfig,
  injuries: { bodyPart: string; severity: string; description: string }[],
  exercises: { id: string; name: string; muscleGroups: string[] }[],
): Promise<AISkillResponse<InjuryFilterOutput>> {
  try {
    const prompt = `
Active injuries:
${injuries.map(i => `- ${i.bodyPart} (${i.severity}): ${i.description}`).join('\n')}

Available exercises:
${exercises.map(e => `- ${e.id}: ${e.name} [${e.muscleGroups.join(', ')}]`).join('\n')}

Which exercises are safe to perform?`.trim();

    const raw = await sendPrompt(config, INJURY_FILTER_SYSTEM, prompt);
    const data = parseJSON<InjuryFilterOutput>(raw);
    return wrap(config.provider, 'injury_filter', data, raw);
  } catch (e) {
    return wrapError(config.provider, 'injury_filter', e);
  }
}

// ─── Skill: QoL Recommendations ──────────────────────────────────────────────

const QOL_SYSTEM = `
You are a longevity and performance coach assistant embedded in a fitness app.
Given the user's body composition metrics, training history, and medical context,
produce personalised quality-of-life recommendations.
Respond with valid JSON:
{
  "recommendations": [
    {
      "category": "training | nutrition | recovery | medical | lifestyle",
      "priority": "high | medium | low",
      "title": "short title",
      "detail": "1-2 sentences of actionable guidance"
    }
  ],
  "longevityScore": <number 0-100 based on overall health indicators>
}
Wrap in \`\`\`json ... \`\`\`.
`.trim();

export async function getQoLRecommendations(
  config: AIConfig,
  context: {
    ffmi?: number;
    fmi?: number;
    tdee?: number;
    workoutFrequency?: number;
    conditions?: string[];
    ageYears?: number;
    sex?: string;
  },
): Promise<AISkillResponse<QoLRecommendationsOutput>> {
  try {
    const prompt = `
User profile:
- FFMI: ${context.ffmi?.toFixed(1) ?? 'unknown'}
- FMI: ${context.fmi?.toFixed(1) ?? 'unknown'}
- TDEE: ${context.tdee ?? 'unknown'} kcal
- Workout frequency: ${context.workoutFrequency ?? 'unknown'} sessions/week
- Age: ${context.ageYears ?? 'unknown'}, Sex: ${context.sex ?? 'unknown'}
- Medical conditions: ${context.conditions?.join(', ') || 'none reported'}

Generate personalised recommendations.`.trim();

    const raw = await sendPrompt(config, QOL_SYSTEM, prompt);
    const data = parseJSON<QoLRecommendationsOutput>(raw);
    return wrap(config.provider, 'qol_recommendations', data, raw);
  } catch (e) {
    return wrapError(config.provider, 'qol_recommendations', e);
  }
}

// ─── Skill: Energy Coaching ───────────────────────────────────────────────────

const ENERGY_COACHING_SYSTEM = `
You are a nutrition and energy expenditure coach assistant.
Given the user's TDEE breakdown (BMR, activity, workout energy) and their stated goals,
give concise, actionable coaching.
Respond with valid JSON:
{
  "tdeeAssessment": "1 sentence assessing their TDEE",
  "calorieGuidance": "1-2 sentences on calorie targets",
  "workoutIntensityFeedback": "1-2 sentences on their workout energy output",
  "suggestions": ["up to 4 short actionable suggestions"]
}
Wrap in \`\`\`json ... \`\`\`.
`.trim();

export async function getEnergyCoaching(
  config: AIConfig,
  context: {
    bmr: number;
    activityKcal: number;
    workoutKcal: number;
    tdee: number;
    goal: string;
    recentWorkoutKcals: number[];
  },
): Promise<AISkillResponse<EnergyCoachingOutput>> {
  try {
    const prompt = `
TDEE breakdown:
- BMR: ${context.bmr} kcal
- Activity (NEAT): ${context.activityKcal} kcal
- Workout expenditure: ${context.workoutKcal} kcal
- Total TDEE: ${context.tdee} kcal
- Goal: ${context.goal}
- Recent workout kcal history: ${context.recentWorkoutKcals.join(', ')} kcal

Provide energy coaching.`.trim();

    const raw = await sendPrompt(config, ENERGY_COACHING_SYSTEM, prompt);
    const data = parseJSON<EnergyCoachingOutput>(raw);
    return wrap(config.provider, 'energy_coaching', data, raw);
  } catch (e) {
    return wrapError(config.provider, 'energy_coaching', e);
  }
}
