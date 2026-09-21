'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/ImageUploader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Note } from '@/types';
import { Calendar, Trash2, ArrowRight, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';
import styles from '../page.module.css';
import { readGenerationStream, type GenerationStep, type StepProgress } from '@/lib/generation-progress';
import { aiActionMessage, type AiActions } from '@/lib/ai-actions';

function getNoteExcerpt(note: Note) {
  const source = note.summary?.trim() || (Array.isArray(note.notes) ? note.notes.join(' ') : '');
  const plainText = source
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!plainText) return 'No extracted note content available.';
  return plainText.length > 180 ? `${plainText.slice(0, 177)}...` : plainText;
}

export default function Dashboard() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<Partial<Record<GenerationStep, StepProgress>>>({});
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [aiBoost, setAiBoost] = useState(false);
  const [actions, setActions] = useState<AiActions | null>(null);
  const [actionsError, setActionsError] = useState<string | null>(null);
  const generationInFlight = useRef(false);
  const actionFetchVersion = useRef(0);

  const refreshActions = useCallback(async () => {
    const version = ++actionFetchVersion.current;
    try {
      const response = await fetch('/api/ai-actions', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not check your AI actions. Please try again.');
      const balance: AiActions = await response.json();
      if (version === actionFetchVersion.current) {
        setActions(balance);
        setActionsError(null);
      }
    } catch {
      if (version === actionFetchVersion.current) {
        setActions(null);
        setActionsError('Could not check your AI actions. Please try again.');
      }
    }
  }, []);

  useEffect(() => {
    const onFocus = () => { void refreshActions(); };
    const initial = window.setTimeout(onFocus, 0);
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(onFocus, 60_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [refreshActions]);

  useEffect(() => {
    if (!actions) return;
    const timer = window.setTimeout(() => { void refreshActions(); }, Math.max(1000, Date.parse(actions.resetsAt) - Date.now() + 1000));
    return () => window.clearTimeout(timer);
  }, [actions, refreshActions]);

  const actionCost = aiBoost ? 3 : 1;
  const allowanceMessage = actions ? aiActionMessage(actions.remaining, actionCost) : null;

  const [notesError, setNotesError] = useState<string | null>(null);

  // Notes are loaded through the authenticated server route, never from the browser database client.
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await fetch('/api/notes');
        if (!response.ok) throw new Error('Could not load notes.');
        setNotes(await response.json());
      } catch (err) {
        console.error('Failed to load notes:', err);
        setNotesError('Your notes could not be loaded yet. You can still upload a new note.');
      }
    };

    fetchNotes();
  }, []);

  const generationSteps: { id: GenerationStep; label: string }[] = [
    { id: 'storage', label: 'Store source image' },
    { id: 'extraction', label: 'Extract handwritten text' },
    ...(aiBoost ? [{ id: 'questions' as const, label: 'Generate study questions' }] : []),
    ...(aiBoost ? [{ id: 'summary' as const, label: 'Generate summary' }] : []),
    { id: 'save', label: 'Save Cornell note' },
  ];
  const completedSteps = generationSteps.filter(({ id }) => progress[id]?.status === 'complete').length;

  const handleImageSelected = async (base64Data: string) => {
    if (generationInFlight.current) return;
    if (!actions || allowanceMessage) {
      setGenerationError(allowanceMessage || 'Please wait while we check your AI actions.');
      return;
    }
    generationInFlight.current = true;
    setIsLoading(true);
    setProgress({});
    setGenerationError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/x-ndjson',
        },
        body: JSON.stringify({
          image: base64Data,
          includeQuestions: aiBoost,
          includeSummary: aiBoost,
        }),
      });

      // The server charges accepted attempts before generation starts.
      void refreshActions();

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || 'Note generation failed.');
      }

      if (!response.body) throw new Error('Live progress is unavailable. Please try again.');
      const generatedNote = await readGenerationStream(response.body, update => {
        setProgress(previous => ({ ...previous, [update.step]: update }));
      });

      // Add to state and redirect
      setNotes((prev) => [generatedNote, ...prev]);
      router.push(`/notes/${generatedNote.id}`);

    } catch (err) {
      console.error('Error generating notes:', err);
      setGenerationError(err instanceof Error ? err.message : 'Failed to generate note. Please try again.');
      setIsLoading(false);
    } finally {
      generationInFlight.current = false;
      void refreshActions();
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete note.');

      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  return (
    <div className="light-theme" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="container" style={{ flex: 1, padding: '40px 24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', marginTop: '10px' }}>
          <div>
            <img
              src="../pitstopNotes.png"
              alt="Pitstop Notes Logo"
              style={{
                width: '145px',
                height: '145px',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>

        {/* Subtitle */}
        <p
          style={{
            textAlign: 'center',
            fontSize: '1.05rem',
            color: '#ffffffff',
            fontWeight: 500,
            maxWidth: '550px',
            margin: '0 auto 28px auto',
            lineHeight: 1.5,
            fontFamily: 'var(--font-inter)',
          }}
        >Our AI extracts notes and generates printable Cornell notes.</p>

        {/* Upload Action Pill / Loading Card */}
        <div style={{ maxWidth: '600px', width: '100%', margin: '0 auto 48px auto' }}>
          {generationError && <p role="alert" style={{ color: '#b91c1c', background: '#fef2f2', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>{generationError}</p>}
          {isLoading ? (
            <Card style={{ backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.06)' }}>
              <CardContent className={styles.loadingCard}>
                <div className={styles.spinner} style={{ borderTopColor: '#2563eb' }} />
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '6px', color: '#111827', fontFamily: 'var(--font-outfit)' }}>
                    Generating Your Cornell Notes
                  </h3>
                  <p role="status" style={{ color: '#4b5563', fontSize: '0.9rem' }}>
                    {Object.keys(progress).length ? `${completedSteps} of ${generationSteps.length} steps completed` : 'Sending image and waiting for the server…'}
                  </p>
                  <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '6px' }}>Updates reflect completed work. Each step can take a different amount of time.</p>
                </div>

                <div className={styles.loadingSteps} aria-live="polite" style={{ width: '100%', textAlign: 'left' }}>
                  {generationSteps.map(({ id, label }) => {
                    const step = progress[id];
                    const status = step?.status ?? 'pending';
                    return (
                      <div key={id} style={{ padding: '10px 0', borderBottom: '1px solid #e5e7eb', color: status === 'running' ? '#1d4ed8' : '#374151' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {status === 'complete' ? <CheckCircle2 size={16} color="#15803d" /> : <Sparkles size={16} />}
                          <span style={{ fontWeight: 600 }}>{label}</span>
                          <span style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>
                            {status === 'pending' ? 'Waiting' : status === 'running' ? 'In progress' : status === 'warning' ? 'Warning' : status === 'failed' ? 'Failed' : 'Complete'}
                            {step?.durationMs !== undefined && ` · ${(step.durationMs / 1000).toFixed(1)}s`}
                          </span>
                        </div>
                        {step?.detail && <p style={{ fontSize: '0.8rem', margin: '4px 0 0 24px' }}>{step.detail}</p>}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : actions && !allowanceMessage ? (
            <ImageUploader onImageSelected={handleImageSelected} isLoading={isLoading} variant="pill" />
          ) : null}

          {!isLoading && (
            <div
              aria-label="Generation options"
              style={{
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '18px',
              }}
            >
              <button
                type="button"
                aria-pressed={aiBoost}
                aria-describedby="ai-boost-description"
                onClick={() => setAiBoost((enabled) => !enabled)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: `1px solid ${aiBoost ? '#2563eb' : 'rgba(0, 0, 0, 0.14)'}`,
                  borderRadius: '9999px',
                  padding: '9px 14px',
                  backgroundColor: aiBoost ? '#dbeafe' : '#ffffff',
                  color: '#111827',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: '30px',
                    height: '18px',
                    borderRadius: '9999px',
                    backgroundColor: aiBoost ? '#2563eb' : '#9ca3af',
                    padding: '2px',
                    display: 'inline-flex',
                    justifyContent: aiBoost ? 'flex-end' : 'flex-start',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#ffffff' }} />
                </span>
                AI-Boost
              </button>
              <p id="ai-boost-description" style={{ width: '100%', textAlign: 'center', color: '#ffffff', fontSize: '0.875rem', margin: 0 }}>Add study questions and a summary to your notes.</p>

            </div>
          )}
        </div>

        <div style={{ maxWidth: '350px', width: '100%', margin: '0 auto 48px auto' }}>
          <div style={{ background: '#ffffff', color: '#111827', padding: '16px', borderRadius: '16px', marginBottom: '16px', textAlign: 'center' }}>
            <p role="status" style={{ fontWeight: 700 }}>
              {actions ? `${actions.remaining} Actions Left` : actionsError || 'Checking AI actions…'}
            </p>
            <p style={{ fontSize: '0.875rem', marginTop: '6px' }}>No-Boost: 1</p>
            <p style={{ fontSize: '0.875rem', marginTop: '6px' }}>AI-Boosted: 3</p>
            <p style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: '6px' }}>Resets at midnight Pacific time</p>
            {allowanceMessage && <p role="status" style={{ color: '#b45309', marginTop: '8px' }}>{allowanceMessage}</p>}
            {actionsError && <button type="button" onClick={() => { void refreshActions(); }} style={{ marginTop: '8px', color: '#2563eb' }}>Retry</button>}
          </div>
        </div>
        <div>
          <p style={{
            textAlign: 'center',
            fontSize: '1.05rem',
            color: '#ffffffff',
            fontWeight: 500,
            maxWidth: '550px',
            margin: '0 auto 28px auto',
            lineHeight: 1.5,
            fontFamily: 'var(--font-inter)',
          }}>Disclaimer:  We share data with <a style={{ color: '#2563eb' }} href="https://help.openai.com/en/articles/10306912-sharing-feedback-evaluation-and-fine-tuning-data-and-api-inputs-and-outputs-with-openai" target="_blank" rel="noopener noreferrer">OpenAI</a> To make this service free</p>
        </div>

        {/* Recent Notes Section */}
        <section className={styles.notesSection} style={{ borderTop: '1px solid rgba(0, 0, 0, 0.08)', paddingTop: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '24px' }}>
            <h2
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: '#f8f8f8ff',
                fontFamily: 'var(--font-outfit)',
                letterSpacing: '-0.02em',
                textAlign: 'center',
              }}
            >
              Your Notes <span style={{ color: '#2563eb' }}>Supercharged</span>
            </h2>
          </div>

          {notesError && (
            <p role="status" style={{ textAlign: 'center', color: '#b45309', marginBottom: '16px' }}>
              {notesError}
            </p>
          )}

          {notes.length === 0 ? (
            <div className={styles.emptyState} style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)', borderColor: 'rgba(0,0,0,0.08)', padding: '50px 20px' }}>
              <BookOpen size={44} style={{ margin: '0 auto 16px auto', opacity: 0.6, color: '#2563eb' }} />
              <h3 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '6px', color: '#111827' }}>No notes generated yet</h3>
              <p style={{ fontSize: '0.9rem', color: '#4b5563', maxWidth: '320px', margin: '0 auto' }}>
                Snap a photo or upload an image using the controls above to start learning!
              </p>
            </div>
          ) : (
            <div className={styles.notesGrid}>
              {notes.map((note) => (
                <Card
                  key={note.id}
                  interactive
                  onClick={() => router.push(`/notes/${note.id}`)}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.03)';
                  }}
                >
                  <CardContent className={styles.noteCardContent}>
                    <h3 className={styles.noteCardTitle} style={{ color: '#111827', fontWeight: 700, fontSize: '1.15rem' }}>{note.title}</h3>
                    <div className={styles.noteCardDate} style={{ color: '#6b7280' }}>
                      <Calendar size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
                      {new Date(note.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <p className={styles.noteCardExcerpt} style={{ color: '#4b5563', fontSize: '0.875rem' }}>
                      {getNoteExcerpt(note)}
                    </p>

                    <div className={styles.noteCardFooter} style={{ borderTopColor: 'rgba(0,0,0,0.06)' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="no-print"
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        style={{ color: '#9ca3af' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
                      >
                        <Trash2 size={15} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/notes/${note.id}`)}
                        style={{ borderColor: '#2563eb', color: '#2563eb', fontWeight: 600 }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#2563eb';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#2563eb';
                        }}
                      >
                        Study <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


