import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractTextFromImage } from './extract';
import { generateQuestions } from './questions';
import { generateSummary } from './summary';
import type { GenerationEvent, GenerationStep, StepProgress } from '@/lib/generation-progress';

const NOTE_PREFIX = /^(?:[-*•‣◦▪︎‒–—]|\d+[.)])\s+/u;

/**
 * Clean line splits: blank lines start a new note; bullet/number markers also start a new note.
 * Consecutive non-empty lines without a blank or bullet are joined (soft wraps).
 */
function splitNotes(rawText: string): string[] {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim());
  const notes: string[] = [];
  let current = '';

  const flush = () => {
    if (current) {
      notes.push(current);
      current = '';
    }
  };

  for (const line of lines) {
    if (!line) {
      flush();
      continue;
    }

    const isBullet = NOTE_PREFIX.test(line);
    const content = isBullet ? line.replace(NOTE_PREFIX, '').trim() : line;
    if (!content) continue;

    if (isBullet || !current) {
      flush();
      current = content;
    } else {
      current = `${current} ${content}`;
    }
  }

  flush();
  return notes;
}

function deriveTitle(notes: string[]): string {
  const first = notes[0];
  if (!first) return 'Untitled Lecture Note';
  return first.length > 80 ? `${first.slice(0, 77)}...` : first;
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();

    const body = await request.json();
    const { image, includeQuestions, includeSummary } = body; // Base64 data url

    if (typeof image !== 'string' || !image) {
      return NextResponse.json({ error: 'Image data is required.' }, { status: 400 });
    }

    const hasOpenAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here';
    if (!hasOpenAI) {
      return NextResponse.json({ error: 'Note generation is not configured yet.' }, { status: 500 });
    }

    const generate = async (report: (progress: StepProgress) => void) => {
    let imagePath = '';
    const starts = new Map<GenerationStep, number>();
    const begin = (step: GenerationStep) => {
      starts.set(step, performance.now());
      report({ step, status: 'running' });
    };
    const finish = (step: GenerationStep, detail: string, status: StepProgress['status'] = 'complete') => {
      report({ step, status, detail, durationMs: Math.round(performance.now() - (starts.get(step) ?? performance.now())) });
    };
    const measured = async <T,>(step: GenerationStep, work: () => Promise<T>, detail: (result: T) => string): Promise<T> => {
      begin(step);
      try {
        const result = await work();
        finish(step, detail(result));
        return result;
      } catch (error) {
        finish(step, 'This step could not be completed.', 'failed');
        throw error;
      }
    };

    // 1. Upload image to Supabase Storage
    begin('storage');
    if (image.startsWith('data:image')) {
      try {
        const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const contentType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');

          const fileName = `${userId}/${crypto.randomUUID()}`;

          const { data, error } = await supabase.storage
            .from('note-images')
            .upload(fileName, buffer, {
              contentType,
              upsert: false,
            });

          if (!error && data) {
            imagePath = data.path;
          }
        }
      } catch (uploadErr) {
        console.warn('Supabase storage upload failed, proceeding without uploaded file:', uploadErr);
      }
    }
    finish('storage', imagePath ? 'Source image stored' : 'Source image unavailable; continuing with note generation', imagePath ? 'complete' : 'warning');

    // 3. Extract text from image
    const rawText = await measured('extraction', async () => {
      const text = await extractTextFromImage(image);
      if (!text.trim()) throw new Error('No text could be extracted from this image.');
      return text;
    }, text => `${text.trim().split(/\s+/).length} words extracted · ${splitNotes(text).length} note sections`);

    const notes = splitNotes(rawText);

    // 4. Generate optional study aids in parallel. Text extraction always runs.
    const [summary, cues] = await Promise.all([
      includeSummary === true ? measured('summary', () => generateSummary(rawText), text => `${text.trim() ? text.trim().split(/\s+/).length : 0} summary words`) : Promise.resolve(''),
      includeQuestions === true ? measured('questions', () => generateQuestions(rawText), questions => `${questions.length} questions generated`) : Promise.resolve<string[]>([]),
    ]);

    const parsedNote = {
      title: deriveTitle(notes),
      classPeriod: '',
      essentialQuestion: '',
      cues,
      notes,
      summary,
    };

    try {
      begin('save');
      const { data, error } = await supabase
        .from('notes')
        .insert({
          title: parsedNote.title,
          class_period: parsedNote.classPeriod,
          essential_question: parsedNote.essentialQuestion,
          cues: parsedNote.cues,
          notes: parsedNote.notes,
          summary: parsedNote.summary,
          image_path: imagePath || null,
          clerk_user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;
      finish('save', 'Note saved to your dashboard');
      return NextResponse.json({ ...data, id: String(data.id), classPeriod: data.class_period ?? '', essentialQuestion: data.essential_question ?? '' });
    } catch (dbErr) {
      console.error('Database save failed:', dbErr);
      finish('save', 'Your note could not be saved.', 'failed');
      return NextResponse.json({ error: 'Could not save the generated note.' }, { status: 500 });
    }
    };

    // Preserve the JSON response for callers that do not request progress.
    if (!request.headers.get('accept')?.includes('application/x-ndjson')) {
      return await generate(() => {});
    }
    let closed = false;
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: GenerationEvent) => {
          if (!closed) controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
        };
        try {
          const result = await generate(progress => send({ type: 'progress', ...progress }));
          const payload = await result.json();
          send(result.ok ? { type: 'complete', note: payload } : { type: 'error', error: payload.error });
        } catch (error) {
          console.error('Generation stream failed:', error);
          send({ type: 'error', error: 'Note generation failed. Please try again.' });
        } finally {
          if (!closed) controller.close();
          closed = true;
        }
      },
      cancel() { closed = true; },
    });
    return new Response(stream, { headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    } });

  } catch (err: unknown) {
    console.error('API generate error:', err);
    return NextResponse.json({ error: 'Note generation failed. Please try again.' }, { status: 500 });
  }
}
