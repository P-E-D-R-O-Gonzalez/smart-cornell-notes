import { createAdminClient } from '@/lib/supabase/admin';
import type { AiActions } from './ai-actions';

// Only server routes supply the authenticated Clerk user and calculated cost.
export async function getAiActions(userId: string, cost = 0): Promise<AiActions> {
  const { data, error } = await createAdminClient().rpc('use_daily_ai_actions', {
    p_user_id: userId,
    p_cost: cost,
  });
  if (error || !data || typeof data.allowed !== 'boolean' ||
      !Number.isInteger(data.remaining) || data.remaining < 0 || data.remaining > 6 ||
      data.limit !== 6 || typeof data.resetsAt !== 'string' || !Number.isFinite(Date.parse(data.resetsAt))) {
    console.error('AI action allowance unavailable:', error);
    throw new Error('Could not check your AI actions. Please try again.');
  }
  return data as AiActions;
}
