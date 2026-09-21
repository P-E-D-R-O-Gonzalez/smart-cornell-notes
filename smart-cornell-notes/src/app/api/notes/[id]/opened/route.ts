import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Note not found.' }, { status: 404 });

  const { data, error } = await createAdminClient().rpc('record_note_opened', { p_note_id: id, p_user_id: userId });
  if (error) return NextResponse.json({ error: 'Could not record this review.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Study note not found.' }, { status: 404 });
  return NextResponse.json({ last_opened_at: data }, { headers: { 'Cache-Control': 'no-store' } });
}
