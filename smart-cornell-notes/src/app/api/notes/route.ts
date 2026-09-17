import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await createAdminClient()
    .from('notes')
    .select('id, title, class_period, essential_question, cues, notes, summary, created_at')
    .eq('clerk_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Could not load notes:', error);
    return NextResponse.json({ error: 'Could not load notes.' }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map((note) => ({
    ...note,
    id: String(note.id),
    title: note.title ?? 'Untitled Lecture Note',
    classPeriod: note.class_period ?? '',
    essentialQuestion: note.essential_question ?? '',
    cues: Array.isArray(note.cues) ? note.cues : [],
    notes: Array.isArray(note.notes) ? note.notes : [],
    summary: note.summary ?? '',
  })));
}
