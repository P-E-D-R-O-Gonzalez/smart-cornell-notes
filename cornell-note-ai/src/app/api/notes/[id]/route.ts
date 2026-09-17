import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ id: string }> };

function parseId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'Note not found.' }, { status: 404 });

  const supabase = createAdminClient();
  const { data: note, error } = await supabase
    .from('notes')
    .select('id, title, class_period, essential_question, cues, notes, summary, image_url, image_path, created_at')
    .eq('id', id)
    .eq('clerk_user_id', userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Could not load note.' }, { status: 500 });
  if (!note) return NextResponse.json({ error: 'Note not found.' }, { status: 404 });

  let imageUrl = note.image_url ?? undefined;
  if (note.image_path) {
    const { data: signedUrl, error: signedUrlError } = await supabase.storage
      .from('note-images')
      .createSignedUrl(note.image_path, 60 * 60);
    if (signedUrlError) console.warn('Could not create note image URL:', signedUrlError);
    else imageUrl = signedUrl.signedUrl;
  }

  return NextResponse.json({ ...note, id: String(note.id), image_url: imageUrl, classPeriod: note.class_period ?? '', essentialQuestion: note.essential_question ?? '' });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'Note not found.' }, { status: 404 });

  const body = await request.json();
  const { title, classPeriod, essentialQuestion, cues, notes, summary } = body;
  if (typeof title !== 'string' || typeof classPeriod !== 'string' || typeof essentialQuestion !== 'string' || !Array.isArray(cues) || !Array.isArray(notes) || typeof summary !== 'string') {
    return NextResponse.json({ error: 'Invalid note data.' }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from('notes')
    .update({ title, class_period: classPeriod, essential_question: essentialQuestion, cues, notes, summary })
    .eq('id', id)
    .eq('clerk_user_id', userId)
    .select('id, title, class_period, essential_question, cues, notes, summary, created_at')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Could not save note.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Note not found.' }, { status: 404 });
  return NextResponse.json({ ...data, id: String(data.id), classPeriod: data.class_period ?? '', essentialQuestion: data.essential_question ?? '' });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: 'Note not found.' }, { status: 404 });

  const supabase = createAdminClient();
  const { data: deleted, error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('clerk_user_id', userId)
    .select('image_path')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Could not delete note.' }, { status: 500 });
  if (!deleted) return NextResponse.json({ error: 'Note not found.' }, { status: 404 });

  if (deleted.image_path) {
    const { error: storageError } = await supabase.storage.from('note-images').remove([deleted.image_path]);
    if (storageError) console.warn('Could not remove note image:', storageError);
  }

  return new NextResponse(null, { status: 204 });
}
