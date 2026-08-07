import { openai } from '@/lib/openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { supabase } from '@/lib/supabase';

const SummarySchema = z.object({
    summary: z.string().describe("A comprehensive 3-5 sentence academic summary.")
});

export async function generateSummary(rawText: string): Promise<string> {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.2,
        messages: [
            { role: 'system', content: 'You are an expert academic tutor.' },
            { role: 'user', content: `Summarize the following notes:${rawText} in a 100 words` }
        ],
        response_format: zodResponseFormat(SummarySchema, 'summary_output')
    });
    const summaryData = JSON.parse(response.choices[0].message.content || '{}');
    return summaryData.summary || '';
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

        const summary = await generateSummary(rawNotesText);

        if (noteId && hasSupabase) {
            await supabase
                .from('notes')
                .update({ summary })
                .eq('id', noteId);
        }

        return Response.json({ summary });
    } catch (err: any) {
        console.error('Error in summary generation:', err);
        return Response.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
