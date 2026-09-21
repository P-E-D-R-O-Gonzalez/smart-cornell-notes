'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Note } from '@/types';
import { getStudyReview, studyDateLabel, studyDay } from '@/lib/study-schedule';
import styles from './ForgettingCurve.module.css';

export function ForgettingCurve({ notes, loading, error }: { notes: Note[]; loading: boolean; error: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    const initial = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 30_000);
    window.addEventListener('focus', update);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  const reviews = now ? notes.flatMap(note => {
    const review = getStudyReview(note, now);
    return review ? [{ note, ...review }] : [];
  }).sort((a, b) => a.dueDay - b.dueDay || a.note.id.localeCompare(b.note.id)) : [];
  const due = reviews.filter(review => review.isDue);
  const next = reviews.find(review => !review.isDue);
  const pending = loading || !now;

  return <section className={styles.section} aria-label="Forgetting curve study schedule">
    <button type="button" className={styles.card} aria-expanded={expanded} aria-controls="study-recommendations" onClick={() => setExpanded(value => !value)}>
      <span className={styles.heading}><span>Forgetting Curve</span><span className={styles.badge}>{error ? 'Unavailable' : pending ? 'Loading…' : `${due.length} ${due.length === 1 ? 'note' : 'notes'} to study`}</span></span>
      <span className={styles.intro}>Keep it fresh. Revisit your notes on days 1, 3, and 7.</span>
      <svg className={styles.graph} viewBox="0 0 640 320" role="img" aria-label="Illustrative memory graph. A dashed line declines without review. A solid line rises with reviews on days 1, 3, and 7.">
        <text x="58" y="24" className={styles.label}>Memory retention (illustrative)</text>
        <path d="M58 45 V246 H602" fill="none" stroke="#172033" strokeWidth="3" />
        <text x="48" y="62" textAnchor="end">High</text><text x="48" y="243" textAnchor="end">Low</text>
        {[126, 262, 534].map((x, i) => <g key={x}>
          <path d={`M${x} 50 V246`} stroke="#64748b" strokeWidth="2" strokeDasharray="4 5" />
          <text x={x} y="270" textAnchor="middle" className={styles.label}>Day {[1, 3, 7][i]}</text>
        </g>)}
        <text x="58" y="270" textAnchor="middle">0</text>
        <path d="M58 58 C85 130 102 170 126 190 S210 231 262 232 S460 237 600 238" fill="none" stroke="#172033" strokeWidth="5" strokeDasharray="10 7" />
        <path d="M58 58 Q85 150 126 190 L126 58 Q175 132 262 165 L262 58 Q360 105 534 135 L534 58 Q568 65 600 70" fill="none" stroke="#1746b5" strokeWidth="6" strokeLinejoin="round" />
        {[126, 262, 534].map(x => <circle key={x} cx={x} cy="58" r="7" fill="#fff" stroke="#1746b5" strokeWidth="4" />)}
        <text x="330" y="307" textAnchor="middle" className={styles.label}>Days after note creation</text>
      </svg>
      <span className={styles.legend}><span><i className={styles.solid} />With reviews</span><span><i className={styles.dashed} />Without reviews</span></span>
      <span className={styles.caption}>Illustration only — not a measurement of your memory.</span>
      <span className={styles.action}>{expanded ? 'Hide study recommendations ↑' : 'View notes to study →'}</span>
    </button>
    <div id="study-recommendations" hidden={!expanded} className={styles.panel}>
      <h3>Notes to study</h3>
      <p className={styles.intro}>Reviews follow Pacific calendar days. Opening a note completes its due reviews.</p>
      {error ? <p role="alert">Study recommendations could not be loaded. Reload the dashboard to try again.</p> : pending ? <p role="status">Loading your study schedule…</p> : <>
        {due.length > 0 ? <ul className={styles.list}>{due.map(review => <li key={review.note.id}>
          <div><h4>{review.note.title}</h4><p className={styles.reason}>Day {review.milestone} review · {review.overdueDays ? `${review.overdueDays} ${review.overdueDays === 1 ? 'day' : 'days'} overdue` : 'Due today'}</p>
            <p>Created {studyDateLabel(studyDay(review.note.created_at))} · Last opened {review.note.last_opened_at ? studyDateLabel(studyDay(review.note.last_opened_at)) : 'Not yet'}</p></div>
          <Link className={styles.study} href={`/notes/${review.note.id}`} prefetch={false} aria-label={`Study ${review.note.title}`}>Study →</Link>
        </li>)}</ul> : <p className={styles.caughtUp}>{notes.some(note => note.study_enabled) ? 'You’re caught up!' : 'Create a new note to start your 1, 3, and 7 day review schedule.'}</p>}
        {next && <p className={styles.next}>Next review: <strong>{next.note.title}</strong> · Day {next.milestone} · {studyDateLabel(next.dueDay)}</p>}
      </>}
    </div>
  </section>;
}
