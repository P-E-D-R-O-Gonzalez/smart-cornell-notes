import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { extractTextFromImage } from './extract';
import { generateQuestions } from './questions';
import { generateSummary } from './summary';

const BULLET_PREFIX = /^(?:[-*•▪◦]|\d+[.)])\s+/;

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

    const isBullet = BULLET_PREFIX.test(line);
    const content = isBullet ? line.replace(BULLET_PREFIX, '').trim() : line;
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
    const supabase = createServerClient();

    const body = await request.json();
    const { image, includeQuestions, includeSummary } = body; // Base64 data url

    if (!image) {
      return NextResponse.json({ error: 'Image data is required.' }, { status: 400 });
    }

    let imageUrl = '';

    const hasOpenAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here';

    // 1. Upload image to Supabase Storage
    if (image.startsWith('data:image')) {
      try {
        const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const contentType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');

          const fileName = crypto.randomUUID();

          const { data, error } = await supabase.storage
            .from('note-images')
            .upload(fileName, buffer, {
              contentType,
              upsert: false,
            });

          if (!error && data) {
            const { data: publicUrlData } = supabase.storage
              .from('note-images')
              .getPublicUrl(fileName);

            if (publicUrlData) {
              imageUrl = publicUrlData.publicUrl;
            }
          }
        }
      } catch (uploadErr) {
        console.warn('Supabase storage upload failed, proceeding without uploaded file:', uploadErr);
      }
    }

    // 2. OpenAI check
    if (!hasOpenAI) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured. Please add your API key to .env.local.' },
        { status: 500 }
      );
    }

    // 3. Extract text from image
    const rawText = await extractTextFromImage(image);
    if (!rawText) {
      throw new Error('Failed to extract raw text from image.');
    }

    const notes = splitNotes(rawText);

    // 4. Generate optional study aids in parallel. Text extraction always runs.
    const [summary, cues] = await Promise.all([
      includeSummary === true ? generateSummary(rawText) : Promise.resolve(''),
      includeQuestions === true ? generateQuestions(rawText) : Promise.resolve<string[]>([]),
    ]);

    const parsedNote = {
      title: deriveTitle(notes),
      cues,
      notes,
      summary,
    };

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          title: parsedNote.title,
          cues: parsedNote.cues,
          notes: parsedNote.notes,
          summary: parsedNote.summary,
          image_url: imageUrl || null,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } catch (dbErr) {
      console.warn('Database save failed, returning local temporary record:', dbErr);
      const tempId = `local-${Date.now()}`;
      return NextResponse.json({
        id: tempId,
        ...parsedNote,
        image_url: imageUrl || image,
        created_at: new Date().toISOString(),
      });
    }

  } catch (err: any) {
    console.error('API generate error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
