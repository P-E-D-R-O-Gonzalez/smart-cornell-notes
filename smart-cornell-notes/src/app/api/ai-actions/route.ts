import { auth } from '@clerk/nextjs/server';
import { getAiActions } from '@/lib/ai-actions-server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return Response.json(await getAiActions(userId), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Could not check your AI actions. Please try again.' }, { status: 503 });
  }
}
