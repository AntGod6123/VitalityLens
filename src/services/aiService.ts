/**
 * AI service layer — wraps calls to Claude API for:
 *  - Medical document summarisation & restriction extraction
 *  - Injury-aware workout filtering
 *  - Quality-of-life recommendations
 */

export interface DocumentAnalysisResult {
  summary: string;
  conditions: string[];
  restrictions: string[];
  recommendations: string[];
}

export interface WorkoutRecommendation {
  allowedExerciseIds: string[];
  restrictedExerciseIds: string[];
  reasoning: string;
}

/**
 * Summarise a medical document and extract workout-relevant restrictions.
 * Requires ANTHROPIC_API_KEY in environment.
 */
export async function analyseMedicalDocument(
  documentText: string,
): Promise<DocumentAnalysisResult> {
  // TODO: implement Claude API call
  // Model: claude-sonnet-4-6
  // Prompt: extract conditions, restrictions, and longevity recommendations
  throw new Error('analyseMedicalDocument not yet implemented');
}

/**
 * Given active injuries and a full exercise list, return which exercises
 * are safe to perform.
 */
export async function filterWorkoutsByInjury(
  injuryDescriptions: string[],
  exerciseNames: string[],
): Promise<WorkoutRecommendation> {
  // TODO: implement Claude API call
  throw new Error('filterWorkoutsByInjury not yet implemented');
}

/**
 * Generate personalised quality-of-life recommendations based on
 * body composition metrics, nutrition, and medical history.
 */
export async function generateQualityOfLifeRecommendations(context: {
  ffmi: number;
  fmi: number;
  tdee: number;
  conditions: string[];
}): Promise<string[]> {
  // TODO: implement Claude API call
  throw new Error('generateQualityOfLifeRecommendations not yet implemented');
}
