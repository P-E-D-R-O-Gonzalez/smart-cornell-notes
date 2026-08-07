import OpenAI from 'openai';
import { z } from 'zod';

// Note: In Next.js App Router, env variables are read from process.env on the server side.
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Zod Schema for structured output validation
export const CornellNoteSchema = z.object({
  title: z.string().describe('A descriptive title matching the material'),
  cues: z.array(z.string()).describe('Keywords, critical questions, or prompts for the left-hand column'),
  notes: z.array(z.string()).describe('Detailed explanations, main points, bullet lists, or facts matching the cues'),
  summary: z.string().describe('A comprehensive summary at the bottom summarizing the entire content in 2-4 sentences'),
});

export type CornellNoteSchemaType = z.infer<typeof CornellNoteSchema>;
