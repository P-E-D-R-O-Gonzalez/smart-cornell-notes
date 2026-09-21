export interface AiActions {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetsAt: string;
}

export function aiActionCost(includeQuestions: unknown, includeSummary: unknown): number {
  // Legacy callers requesting either study aid still pay the boost price.
  return includeQuestions === true || includeSummary === true ? 3 : 1;
}

export function aiActionMessage(remaining: number, cost: number): string | null {
  if (remaining === 0) return 'No AI actions left today. Come back tomorrow.';
  if (remaining < cost) return 'Not enough AI actions for AI-Boost. Turn off AI-Boost to extract your notes for 1 action.';
  return null;
}
