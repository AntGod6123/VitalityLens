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
  NutritionAnalysisOutput,
  WorkoutCritiqueOutput,
  LongevityAnalysisOutput,
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

// ─── Skill: Nutrition Analysis ────────────────────────────────────────────────

const NUTRITION_ANALYSIS_SYSTEM = `
You are a sports nutrition analyst embedded in a fitness tracking app.
Given the user's recent nutrition logs (calories, macros), TDEE, and body composition goals,
analyse their diet quality and provide actionable guidance.
Respond with valid JSON:
{
  "assessment": "2-3 sentence overall assessment of their nutrition",
  "calorieBalance": "surplus | deficit | maintenance",
  "proteinAdequacy": "adequate | low | high",
  "micronutrientFlags": ["potential deficiencies or excess to watch"],
  "suggestions": ["up to 5 specific dietary improvements"],
  "mealTimingTips": ["up to 3 peri-workout or circadian meal timing tips"]
}
Wrap in \`\`\`json ... \`\`\`.
`.trim();

export async function getNutritionAnalysis(
  config: AIConfig,
  context: {
    avgDailyCalories: number;
    avgProteinG: number;
    avgCarbsG: number;
    avgFatG: number;
    tdee: number;
    goal: string;
    daysLogged: number;
    lbmKg?: number;
  },
): Promise<AISkillResponse<NutritionAnalysisOutput>> {
  try {
    const prompt = `
Nutrition summary (${context.daysLogged} days logged):
- Average daily calories: ${context.avgDailyCalories} kcal
- Average protein: ${context.avgProteinG}g  |  Carbs: ${context.avgCarbsG}g  |  Fat: ${context.avgFatG}g
- Estimated TDEE: ${context.tdee} kcal
- Caloric balance: ${context.avgDailyCalories - context.tdee > 0 ? '+' : ''}${Math.round(context.avgDailyCalories - context.tdee)} kcal/day
- Lean body mass: ${context.lbmKg ? `${context.lbmKg.toFixed(1)} kg` : 'unknown'}
- Goal: ${context.goal}

Analyse their nutrition and provide recommendations.`.trim();

    const raw = await sendPrompt(config, NUTRITION_ANALYSIS_SYSTEM, prompt);
    const data = parseJSON<NutritionAnalysisOutput>(raw);
    return wrap(config.provider, 'nutrition_analysis', data, raw);
  } catch (e) {
    return wrapError(config.provider, 'nutrition_analysis', e);
  }
}

// ─── Skill: Workout Critique ──────────────────────────────────────────────────

const WORKOUT_CRITIQUE_SYSTEM = `
You are an elite strength and conditioning coach assistant.
Given the details of a completed workout session (exercises, sets, reps, weights, completion rates),
critique the session and provide forward-looking guidance.
Respond with valid JSON:
{
  "overallRating": <number 1-10>,
  "volumeAssessment": "1-2 sentences on total training volume",
  "intensityAssessment": "1-2 sentences on load selection and RPE",
  "recoveryRisk": "low | moderate | high",
  "strongPoints": ["up to 3 things done well"],
  "improvements": ["up to 3 specific things to improve next session"],
  "nextSessionFocus": "1 sentence on the single most important focus for next time"
}
Wrap in \`\`\`json ... \`\`\`.
`.trim();

export async function getWorkoutCritique(
  config: AIConfig,
  context: {
    sessionName: string;
    sessionType: string;
    durationMinutes: number;
    totalKcal: number;
    exercises: {
      name: string;
      sets: number;
      totalReps: number;
      maxWeightKg: number;
      completionRate: number;
      avgRpe?: number;
    }[];
    overallCompletionRate: number;
  },
): Promise<AISkillResponse<WorkoutCritiqueOutput>> {
  try {
    const exerciseLines = context.exercises.map(
      e => `  • ${e.name}: ${e.sets} sets × ${e.totalReps} reps @ ${e.maxWeightKg}kg — ${Math.round(e.completionRate * 100)}% completion${e.avgRpe ? ` (RPE ${e.avgRpe.toFixed(1)})` : ''}`,
    ).join('\n');

    const prompt = `
Session: "${context.sessionName}" (${context.sessionType})
Duration: ${context.durationMinutes} min  |  Energy: ${context.totalKcal} kcal
Overall completion: ${Math.round(context.overallCompletionRate * 100)}%

Exercises performed:
${exerciseLines}

Critique this session and advise on the next.`.trim();

    const raw = await sendPrompt(config, WORKOUT_CRITIQUE_SYSTEM, prompt);
    const data = parseJSON<WorkoutCritiqueOutput>(raw);
    return wrap(config.provider, 'workout_critique', data, raw);
  } catch (e) {
    return wrapError(config.provider, 'workout_critique', e);
  }
}

// ─── Skill: Longevity Analysis ────────────────────────────────────────────────

const LONGEVITY_ANALYSIS_SYSTEM = `
You are a longevity medicine expert assistant embedded in a health tracking app.
Given the user's key biomarkers (VO₂ Max, HRV, grip strength, sleep, blood pressure, steps, resting heart rate),
their body composition metrics, and chronological age, provide a concise longevity assessment.
Respond with valid JSON:
{
  "overallAssessment": "2-3 sentences on their overall longevity profile",
  "topStrengths": ["up to 3 biomarkers or habits that are strong longevity assets"],
  "topRisks": ["up to 3 biomarkers or habits that represent the highest longevity risk"],
  "priorityActions": [
    {
      "biomarker": "name of the metric to address",
      "action": "specific, actionable intervention",
      "timeframe": "e.g. 4 weeks, 3 months"
    }
  ],
  "biologicalAgeEstimate": <estimated biological age as integer, optional>
}
Wrap in \`\`\`json ... \`\`\`.
`.trim();

export async function getLongevityAnalysis(
  config: AIConfig,
  context: {
    chronologicalAge?: number;
    sex?: string;
    ffmi?: number;
    fmi?: number;
    markers: { label: string; value: number; unit: string; rating: string }[];
    compositeScore: number;
  },
): Promise<AISkillResponse<LongevityAnalysisOutput>> {
  try {
    const markerLines = context.markers
      .map(m => `  • ${m.label}: ${m.value} ${m.unit} (${m.rating})`)
      .join('\n');

    const prompt = `
User profile:
- Age: ${context.chronologicalAge ?? 'unknown'}, Sex: ${context.sex ?? 'unknown'}
- FFMI: ${context.ffmi?.toFixed(1) ?? 'unknown'}, FMI: ${context.fmi?.toFixed(1) ?? 'unknown'}
- Longevity composite score: ${context.compositeScore}/100

Biomarkers:
${markerLines}

Provide a longevity assessment.`.trim();

    const raw = await sendPrompt(config, LONGEVITY_ANALYSIS_SYSTEM, prompt);
    const data = parseJSON<LongevityAnalysisOutput>(raw);
    return wrap(config.provider, 'longevity_analysis', data, raw);
  } catch (e) {
    return wrapError(config.provider, 'longevity_analysis', e);
  }
}
