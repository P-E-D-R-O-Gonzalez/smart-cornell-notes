import type { Note } from '../types';

export type GenerationStep = 'storage' | 'extraction' | 'questions' | 'summary' | 'save';
export type StepProgress = {
  step: GenerationStep;
  status: 'running' | 'complete' | 'warning' | 'failed';
  detail?: string;
  durationMs?: number;
};
export type GenerationEvent =
  | ({ type: 'progress' } & StepProgress)
  | { type: 'complete'; note: Note }
  | { type: 'error'; error: string };

// A response chunk can contain part of a JSON line or multiple lines.
export async function readGenerationStream(
  body: ReadableStream<Uint8Array>,
  onProgress: (progress: StepProgress) => void,
): Promise<Note> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let note: Note | undefined;
  const consume = (line: string) => {
    if (!line.trim()) return;
    const event: GenerationEvent = JSON.parse(line);
    if (event.type === 'error') throw new Error(event.error);
    if (event.type === 'progress') onProgress(event);
    if (event.type === 'complete') note = event.note;
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      const lines = pending.split('\n');
      pending = lines.pop() ?? '';
      lines.forEach(consume);
      if (done) break;
    }
    consume(pending);
    if (!note) throw new Error('Connection ended before your note was saved. Check your dashboard before trying again.');
    return note;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
