import { openai } from '@/lib/openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

const QuestionsSchema = z.object({
    questions: z.array(z.string()).describe("5 study questions evaluating the text.")
});

export async function generateQuestions(rawText: string): Promise<string[]> {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.3,
        messages: [
            {
                role: 'system',
                content: 'Generate 5 high-level inquiry questions (Costa Level 2 & 3) forcing analysis. No basic recall.'
            },
            {
                role: 'user',
                content: `Generate questions for:\n${rawText}`
            }
        ],
        response_format: zodResponseFormat(QuestionsSchema, 'questions_output')
    });

    const questionsData = JSON.parse(response.choices[0].message.content || '{}');
    return questionsData.questions || [];
}

export async function POST(req: Request) {
    try {
        const { noteId, rawNotes } = await req.json();
        
        let rawNotesText = rawNotes;
        const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                            process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-supabase-project.supabase.co';

        if (!rawNotesText && noteId && hasSupabase) {
            const { data, error } = await supabase
                .from('notes')
                .select('*')
                .eq('id', noteId)
                .single();
            
            if (!error && data) {
                rawNotesText = Array.isArray(data.notes) ? data.notes.join('\n') : data.notes;
            }
        }

        if (!rawNotesText) {
            return Response.json({ error: 'Raw notes content is required' }, { status: 400 });
        }

        const questions = await generateQuestions(rawNotesText);

        if (noteId && hasSupabase) {
            await supabase
                .from('notes')
                .update({ cues: questions })
                .eq('id', noteId);
        }

        return Response.json({ questions });
    } catch (err: any) {
        console.error('Error in questions generation:', err);
        return Response.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}