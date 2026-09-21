'use client';

import { useEffect, useState } from 'react';

// Mount only after the note is displayed. GETs and prefetches never record reviews.
export function NoteOpenTracker({ id }: { id: string }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let started = false;
    let disposed = false;
    const record = async () => {
      if (started || document.visibilityState !== 'visible') return;
      started = true;
      setFailed(false);
      try {
        const response = await fetch(`/api/notes/${id}/opened`, { method: 'POST', keepalive: true });
        if (!response.ok) throw new Error('Could not record review');
      } catch {
        if (!disposed) setFailed(true);
      }
    };
    const onVisible = () => { void record(); };
    const timer = window.setTimeout(onVisible, 0);
    document.addEventListener('visibilitychange', onVisible);
    return () => { disposed = true; window.clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [id, attempt]);

  if (!failed) return null;
  return <p role="alert" className="no-print" style={{ background: '#fff', color: '#172033', padding: 16, borderRadius: 8, marginBottom: 16 }}>
    Your note is open, but this review could not be recorded.{' '}
    <button type="button" onClick={() => setAttempt(value => value + 1)} style={{ color: '#1746b5', textDecoration: 'underline', font: 'inherit', cursor: 'pointer' }}>Retry recording review</button>
  </p>;
}
