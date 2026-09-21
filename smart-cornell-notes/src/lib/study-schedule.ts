export const STUDY_TIME_ZONE = 'America/Los_Angeles';
export const REVIEW_DAYS = [1, 3, 7] as const;

type StudyNote = { created_at: string; last_opened_at?: string | null; study_enabled?: boolean };
const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: STUDY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

// Calendar dates, rather than elapsed 24-hour periods, preserve the schedule across DST.
export function studyDay(value: string | Date): number {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return NaN;
  const parts = formatter.formatToParts(date);
  const part = (name: string) => Number(parts.find(p => p.type === name)?.value);
  return Date.UTC(part('year'), part('month') - 1, part('day')) / 86_400_000;
}

export function studyDateLabel(day: number): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(day * 86_400_000));
}

export function getStudyReview(note: StudyNote, now = new Date()) {
  if (!note.study_enabled) return null;
  const created = studyDay(note.created_at);
  const today = studyDay(now);
  if (!Number.isFinite(created) || !Number.isFinite(today)) return null;
  const opened = note.last_opened_at ? studyDay(note.last_opened_at) : NaN;
  const milestone = REVIEW_DAYS.find(day => !Number.isFinite(opened) || opened < created + day);
  if (!milestone) return null;
  const dueDay = created + milestone;
  return { milestone, dueDay, overdueDays: Math.max(0, today - dueDay), isDue: today >= dueDay };
}
